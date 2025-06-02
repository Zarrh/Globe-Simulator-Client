import { useEffect } from 'react';

export function useMissiles(socket, name, session, onMissileReceived) {
  useEffect(() => {
    if (!socket) {
      console.warn("useMissiles: Socket instance not provided.");
      return;
    }

    // Listen for missiles launched by other players
    socket.on('missile:launched', (data) => {
      // Call the provided callback function when a missile is received
      onMissileReceived(data);
    });

    return () => {
      socket.off('missile:launched', onMissileReceived); // Remove the specific listener
    };
  }, [socket, name, session, onMissileReceived]); // Dependencies for this effect

  // Function to launch a missile
  const launchMissile = (missileData) => {
    if (socket) {
      socket.emit('missile:launch', missileData);
    } else {
      console.warn("Cannot launch missile: Socket is not connected.");
    }
  };

  return { launchMissile };
}
