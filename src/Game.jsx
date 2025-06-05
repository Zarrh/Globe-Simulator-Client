import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMissiles } from './hooks/useMissiles'; // Import the custom hook
import { io } from 'socket.io-client'; // Socket.IO client library
import Globe from './global/Globe';
import SelectionPage from './global/SelectionPage';
import { areEqual, getSessionCookie } from './functions';
import AxesArrows from './components/AxesArrows';
import { states } from './data';
import ServerPage from './global/ServerPage';


// Main Globe component
const Game = () => {

  const [server, setServer] = useState(null);

  const [session, setSession] = useState(null); // Stores the client's session ID

  const [takenStates, setTakenStates] = useState([]);
  const [selectedState, setSelectedState] = useState(null);

  const [name, setName] = useState('Unknown'); // Player's name (default)
  const [shootingBase, setShootingBase] = useState(null);
  const [ownBasesPositions, setOwnBasesPositions] = useState(null); // Current player's base coordinates
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);

  const [missiles, setMissiles] = useState([]); // List of all active missiles
  const [bases, setBases] = useState([]); // List of all player bases

  const socketRef = useRef(null); // Ref to hold the Socket.IO client instance

  const [magnitude, setMagnitude] = useState(1);
  const [azimuth, setAzimuth] = useState(30);
  const [elevation, setElevation] = useState(30);


  // Poll parameters.json every 5 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetch('/script/parameters.json')
        .then((response) => {
          if (!response.ok) {
            console.log('Script not found');
          }
          return response.json();
        })
        .then((data) => {
          if (typeof data.magnitude === 'number') {
            setMagnitude(data.magnitude);
          }
          if (typeof data.azimuth === 'number') {
            setAzimuth(data.azimuth);
          }
          if (typeof data.elevation === 'number') {
            setElevation(data.elevation);
          }
          if (typeof data.shootingBase === 'string') {
            setShootingBase(data.shootingBase);
          }

          if (!ownBasesPositions) {
            console.warn("No base position assigned yet. Cannot launch missile.");
            return;
          }

          const missileData = {
            startLatLon: ownBasesPositions[data.shootingBase] ?? Object.values(ownBasesPositions)[0], // Missile starts from the player's base
            initialVelocity: [data.magnitude, data.azimuth, data.elevation],
          };

          launchMissile(missileData);
        })
        .catch((error) => {
          console.log('parameters.json not found or invalid: ', error);
        });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [ownBasesPositions]);


  useEffect(() => {
    if (!bases || !ownBasesPositions) return

    const intervalId = setInterval(() => {
      fetch('/api/save-coordinates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bases, ownBasesPositions }),
      })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          console.log('Failed to save coordinates')
        }
      })
      .catch(console.error)
    }, 5000)

    return () => clearInterval(intervalId)
  }, [bases, ownBasesPositions])


  // Effect to fetch the session ID when the component mounts
  useEffect(() => {
    if (!selectedState || !server) return;
    fetch(`${server}/session`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setSession(data.session);
      })
      .catch(error => console.error("Error fetching session:", error));
  }, [selectedState, server]); // Empty dependency array means this runs once on mount


  const _socket = server ? io(server) : undefined;


  useEffect(() => {
    if (!server) return;

    _socket.on('whoami:success', (userData) => {
      setSelectedState(userData.name);
      console.log('User identified:', userData.name);
    });

    const session = getSessionCookie();
    if (session) {
      _socket.emit('whoami', session);
    }

    return () => {
      _socket.off('whoami:success');
    };
  }, [server]);


  useEffect(() => {
    if (!server) return;

    _socket.on('selection:takenStates', (updated) => {
      setTakenStates(updated);
    });

    return () => {
      _socket.off('selection:takenStates');
    };
  }, [server]);

  const setSelection = (state) => {
    setName(state.name);
    setSelectedState(state.name);
    _socket.emit('selection:selectState', state.name);
  };


  // Effect to establish and manage the Socket.IO connection
  useEffect(() => {
    if (session) {
      _socket.off('selection:takenStates');
      _socket.off('whoami:success');
      _socket.off('whoami:failure');
      // Initialize Socket.IO connection
      const socket = io(server, {
        withCredentials: true // This ensures cookies get sent with the connection
      });
      socketRef.current = socket; // Store the socket instance in the ref

      // Emit player:join event to the server
      socket.emit('player:join', { session, name });

      // Listener for the current player's base position (sent by server on join/reconnect)
      socket.on('player:basePosition', ({ session: senderSession, basesPositions: receivedPosition }) => {
        console.log(`Base position received from ${senderSession}:`, receivedPosition);
        // Only update own base position if this is from this client's session
        if (senderSession === session) {
          setOwnBasesPositions(receivedPosition);
        }
      });

      // Listener for when a new player joins (broadcasted by server)
      socket.on('player:joined', (playerData) => {
        console.log(`Player joined: ${playerData.name} with session ${playerData.session} at ${playerData.basesPositions}`);
         setBases((prev) => {
          const newBases = Object.entries(playerData.basesPositions).map(([city, coordinates]) => ({
            session: playerData.session,
            name: playerData.name,
            city: city,
            startLatLon: coordinates,
          }));

          // Prevent duplicates: filter out any bases with the same session and city
          const filteredPrev = prev.filter(
            base => !(
              base.session === playerData.session &&
              playerData.basesPositions.hasOwnProperty(base.city)
            )
          );

          return [...filteredPrev, ...newBases];
        });
      });

      // Listener for all player bases (periodically broadcasted by server for synchronization)
      socket.on('player:allBases', (allBases) => {
        console.log('Received all bases:', allBases);
        setBases(allBases); // Update the entire list of bases
      });

      // Listener for a single missile launch (broadcasted by server)
      socket.on('missile:launched', (data) => {
        console.log('Missile launched by', data.session);
        setMissiles((prev) => {
          let newMissiles = [...prev, data];
          // if (newMissiles.length > 40) {
          //   newMissiles = newMissiles.slice(-1); // Remove the first (oldest) item
          // }
          return newMissiles;
        });
      });


      socket.on('game:gameover', (data) => {
        setIsGameOver(true);
      });


      socket.on('game:win', (data) => {
        setIsWin(true);
      });


      // Cleanup function: Disconnect the socket when the component unmounts
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null; // Clear the ref
          console.log("Socket disconnected on component unmount.");
        }
      };
    }
  }, [session, name]); // Re-run this effect if session or name changes

  // Use the custom useMissiles hook to handle missile launching logic
  // Pass the socket instance from the ref
  const { launchMissile } = useMissiles(socketRef.current, name, session, (missileData) => {
    console.log('Missile received via useMissiles callback:', missileData.session);
  });

  // Handler for the "Launch" button click
  const handleLaunch = () => {
    if (!ownBasesPositions) {
      console.warn("No base position assigned yet. Cannot launch missile.");
      return;
    }

    const missileData = {
      startLatLon: ownBasesPositions[shootingBase] ?? Object.values(ownBasesPositions)[0], // Missile starts from the player's base
      initialVelocity: [magnitude, azimuth, elevation],
    };

    // Emit the missile launch event via the useMissiles hook
    launchMissile(missileData);
    console.log("Launch button clicked, attempting to launch missile.");
  };

  return (
    <>
      {selectedState ? (
        <>
          <Globe missiles={missiles} bases={bases} shootingBase={shootingBase} />
          {/* Fixed Corner Axes */}
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              width: 150,
              height: 150,
              background: 'rgba(255, 255, 255, 0.0)',
            }}
          >
            <AxesArrows />
          </div>
          {/* Launch button */}
          {!isGameOver && !isWin && (
            <>
              <button
                style={{
                  position: 'absolute',
                  top: '2%',
                  left: '20px',
                  padding: '10px 20px',
                  fontSize: 22,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  backgroundColor: '#0a0a0a',
                  color: 'white',
                  border: 'solid 2px white',
                  borderRadius: '5px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                  transition: 'background-color 0.3s ease',
                }}
                disabled={!ownBasesPositions} // Disable if no base position is assigned yet
                onClick={handleLaunch} // Call handleLaunch when clicked
              >
                Launch
              </button>
              <div
                style={{
                  position: 'absolute',
                  top: '10%',
                  left: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0)',
                  padding: '10px',
                  borderRadius: '5px',
                  color: 'white',
                  width: '200px',
                }}
              >
                <div>
                  <label>Magnitude: {magnitude.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.01"
                    value={magnitude}
                    onChange={(e) => setMagnitude(parseFloat(e.target.value))}
                    style={{accentColor: '#1c08f1'}}
                  />
                </div>
                <div>
                  <label>Azimuth: {azimuth.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={azimuth}
                    onChange={(e) => setAzimuth(parseFloat(e.target.value))}
                    style={{accentColor: '#1c08f1'}}
                  />
                </div>
                <div>
                  <label>Elevation: {elevation.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="1"
                    value={elevation}
                    onChange={(e) => setElevation(parseFloat(e.target.value))}
                    style={{accentColor: '#1c08f1'}}
                  />
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '30%',
                  left: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0)',
                  padding: '10px',
                  borderRadius: '5px',
                  color: 'white',
                  width: '200px',
                }}
              >
                <div>
                  <label>Magnitude: {magnitude.toFixed(2)}</label>
                  <input
                    type="number"
                    min="0"
                    max="3"
                    step="0.01"
                    value={magnitude}
                    onChange={(e) => setMagnitude(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label>Azimuth: {azimuth.toFixed(2)}</label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    step="1"
                    value={azimuth}
                    onChange={(e) => setAzimuth(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label>Elevation: {elevation.toFixed(2)}</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    step="1"
                    value={elevation}
                    onChange={(e) => setElevation(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0)',
                  padding: '10px',
                  borderRadius: '5px',
                  color: 'white',
                  width: '20%',
                  overflow: 'scroll',
                  maxHeight: '45vh',
                  scrollbarWidth: 'none',  // For Firefox
                  msOverflowStyle: 'none'  // For Internet Explorer and Edge (legacy)
                }}
              >
                {bases.filter(base => base.name !== selectedState).map((base, index) => (
                  <div key={index} style={{display: 'grid', gridTemplateColumns: '15% 15% 15% 25%', gap: '2em', justifyContent: 'center', alignItems: 'center'}}>
                    <img src={states.find(state => state.name === base.name)?.icon} style={{width: '3em', height: 'auto'}}/>
                    <span>{base?.startLatLon[0]}</span>
                    <span>{base?.startLatLon[1]}</span>
                    <span style={{fontWeight: 'bold', color: states.find(state => state.name === base.name)?.color ?? 'white'}}>{base?.city}</span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '30%',
                  right: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0)',
                  padding: '10px',
                  borderRadius: '5px',
                  color: 'white',
                  width: '20%',
                }}
              >
                {ownBasesPositions && Object.entries(ownBasesPositions).map(([city, coords], index) => (
                  <div 
                    key={index} 
                    style={{display: 'grid', gridTemplateColumns: '15% 15% 15% 25%', gap: '2em', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'}} 
                    onClick={() => {setShootingBase(city); console.log("Selected base: ", city)}}
                  >
                    <img src={states.find(state => state.name === selectedState)?.icon} style={{width: '3em', height: 'auto'}}/>
                    <span>{coords[0]}</span>
                    <span>{coords[1]}</span>
                    <span style={{fontWeight: 'bold', color: states.find(state => state.name === selectedState)?.color ?? 'white'}}>{city}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {isGameOver && (
            <div
              style={{
                position: 'absolute',
                top: '80px',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0)',
                padding: '10px',
                borderRadius: '5px',
                color: 'red',
                width: '200px',
                fontSize: 52,
                fontWeight: 'bold',
              }}
            >
              Defeat
            </div>
          )}
          {isWin && (
            <div
              style={{
                position: 'absolute',
                top: '80px',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0)',
                padding: '10px',
                borderRadius: '5px',
                color: 'green',
                width: '200px',
                fontSize: 52,
                fontWeight: 'bold',
              }}
            >
              Victory
            </div>
          )}
        </>
      ) : server ? (
        <SelectionPage setSelection={setSelection} takenStates={takenStates} setServer={setServer} />
      ) : (
        <ServerPage setServer={setServer} />
      )}
      
    </>
  );
};

export default Game;
