import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMissiles } from './hooks/useMissiles'; // Import the custom hook
import { io } from 'socket.io-client'; // Socket.IO client library
import Globe from './global/Globe';
import SelectionPage from './global/SelectionPage';
import { areEqual, getSessionCookie } from './functions';
import AxesArrows from './components/AxesArrows';
import { states } from './data';

const Base_url = "http://localhost:3001"; // Base URL for your server

// Main Globe component
const Game = () => {

  const [session, setSession] = useState(null); // Stores the client's session ID

  const [takenStates, setTakenStates] = useState([]);
  const [selectedState, setSelectedState] = useState(null);

  const [name, setName] = useState('Unknown'); // Player's name (default)
  const [basePosition, setBasePosition] = useState(null); // Current player's base coordinates
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);

  const [missiles, setMissiles] = useState([]); // List of all active missiles
  const [bases, setBases] = useState([]); // List of all player bases

  const socketRef = useRef(null); // Ref to hold the Socket.IO client instance

  const [velocityX, setVelocityX] = useState(0.1);
  const [velocityY, setVelocityY] = useState(0.2);
  const [velocityZ, setVelocityZ] = useState(0.3);

  // Effect to fetch the session ID when the component mounts
  useEffect(() => {
    if (!selectedState) return;
    fetch(`${Base_url}/session`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setSession(data.session);
      })
      .catch(error => console.error("Error fetching session:", error));
  }, [selectedState]); // Empty dependency array means this runs once on mount


  const _socket = io(Base_url);


  useEffect(() => {

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
  }, []);


  useEffect(() => {

    _socket.on('selection:takenStates', (updated) => {
      setTakenStates(updated);
    });

    return () => {
      _socket.off('selection:takenStates');
    };
  }, []);

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
      const socket = io(Base_url, {
        withCredentials: true // This ensures cookies get sent with the connection
      });
      socketRef.current = socket; // Store the socket instance in the ref

      // Emit player:join event to the server
      socket.emit('player:join', { session, name });

      // Listener for the current player's base position (sent by server on join/reconnect)
      socket.on('player:basePosition', ({ session: senderSession, basePosition: receivedPosition }) => {
        console.log(`Base position received from ${senderSession}:`, receivedPosition);
        // Only update own base position if this is from this client's session
        if (senderSession === session) {
          setBasePosition(receivedPosition);
        }
      });

      // Listener for when a new player joins (broadcasted by server)
      socket.on('player:joined', (playerData) => {
        console.log(`Player joined: ${playerData.name} with session ${playerData.session} at ${playerData.basePosition}`);
        setBases((prev) => {
          // Add the new player's base to the list if it's not already there
          const existingIndex = prev.findIndex(base => base.session === playerData.session);
          if (existingIndex === -1) {
            return [...prev, { session: playerData.session, name: playerData.name, startLatLon: playerData.basePosition }];
          }
          return prev; // Return previous state if already exists
        });
      });

      // Listener for all player bases (periodically broadcasted by server for synchronization)
      socket.on('player:allBases', (allBases) => {
        console.log('Received all bases:', allBases);
        setBases(allBases); // Update the entire list of bases
      });

      // Listener for a single missile launch (broadcasted by server)
      socket.on('missile:launched', (missileData) => {
        console.log('Missile launched by', missileData.session);
        setMissiles((prev) => {
          const newMissiles = [...prev, missileData];
          return newMissiles;
        });
      });


      socket.on('game:gameover', (data) => {
        setIsGameOver(true);
      });


      socket.on('game:win', (data) => {
        setIsWin(true);
      });


      // Listener for when a player disconnects
      // socket.on('player:disconnected', ({ session: disconnectedSession }) => {
      //   console.log(`Player with session ${disconnectedSession} disconnected.`);
      //   // setBases((prev) => prev.filter(base => base.session !== disconnectedSession));
      // });

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
    if (!basePosition) {
      console.warn("No base position assigned yet. Cannot launch missile.");
      return;
    }

    const missileData = {
      startLatLon: basePosition, // Missile starts from the player's base
      initialVelocity: [velocityX, velocityY, velocityZ],
    };

    // Emit the missile launch event via the useMissiles hook
    launchMissile(missileData);
    console.log("Launch button clicked, attempting to launch missile.");
  };

  return (
    <>
      {selectedState ? (
        <>
          <Globe selectedState={selectedState} missiles={missiles} bases={bases} basePosition={basePosition} />
          {/* Fixed Corner Axes */}
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
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
                  border: 'none',
                  borderRadius: '5px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                  transition: 'background-color 0.3s ease',
                }}
                disabled={!basePosition} // Disable if no base position is assigned yet
                onClick={handleLaunch} // Call handleLaunch when clicked
              >
                Launch
              </button>
              <div
                style={{
                  position: 'absolute',
                  top: '10%',
                  left: '20px',
                  backgroundColor: '#0a0a0a',
                  padding: '10px',
                  borderRadius: '5px',
                  color: 'white',
                  width: '200px',
                }}
              >
                <div>
                  <label>X Velocity: {velocityX.toFixed(2)}</label>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.01"
                    value={velocityX}
                    onChange={(e) => setVelocityX(parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <label>Y Velocity: {velocityY.toFixed(2)}</label>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.01"
                    value={velocityY}
                    onChange={(e) => setVelocityY(parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <label>Z Velocity: {velocityZ.toFixed(2)}</label>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.01"
                    value={velocityZ}
                    onChange={(e) => setVelocityZ(parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '30%',
                  left: '20px',
                  backgroundColor: '#0a0a0a',
                  padding: '10px',
                  borderRadius: '5px',
                  color: 'white',
                  width: '200px',
                }}
              >
                <div style={{display: 'grid', gridTemplateColumns: '25% 25% 25%', gap: '2em', justifyContent: 'center', alignItems: 'center'}}>
                  <img src={states.find(state => state.name === selectedState)?.icon} style={{width: '3em', height: 'auto'}}/>
                  <span>{basePosition && basePosition[0]}</span>
                  <span>{basePosition && basePosition[1]}</span>
                </div>
                {bases.filter(base => !areEqual(basePosition, base.startLatLon)).map((base, index) => (
                  <div key={index} style={{display: 'grid', gridTemplateColumns: '25% 25% 25%', gap: '2em', justifyContent: 'center', alignItems: 'center'}}>
                    <img src={states.find(state => state.name === base.name)?.icon} style={{width: '3em', height: 'auto'}}/>
                    <span>{base?.startLatLon[0]}</span>
                    <span>{base?.startLatLon[1]}</span>
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
      ) : (
        <SelectionPage setSelection={setSelection} takenStates={takenStates} />
      )}
      
    </>
  );
};

export default Game;
