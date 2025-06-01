import { useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

export function useMissiles(name, session, onMissileReceived) {
  useEffect(() => {
    // Join with session
    socket.emit('player:join', { name, session });

    // Listen for missiles from others
    socket.on('missile:launched', (data) => {
      onMissileReceived(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [name, session, onMissileReceived]);

  const launchMissile = (missileData) => {
    socket.emit('missile:launch', missileData);
  };

  return { launchMissile };
}
