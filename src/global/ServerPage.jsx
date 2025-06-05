import React, { useState, useEffect } from 'react';
import GlassBall from '../components/GlassBall';

const ServerPage = ({ setServer }) => {

  const [serverAddress, setServerAddress] = useState('');
  const [serverPort, setServerPort] = useState('');

  useEffect(() => {
    const storedConfig = localStorage.getItem('server');
    if (storedConfig) {
      setServer(storedConfig);
    }
  }, []);

  const handleSubmit = () => {
    setServer(`http://${serverAddress}:${serverPort}`)
    localStorage.setItem('server', `http://${serverAddress}:${serverPort}`);
    console.log("Saved server config:", { address: serverAddress, port: serverPort });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', alignContent: 'center', justifyContent: 'center', gap: '1em', overflow: 'hidden', position: 'relative' }}>
      <span
        style={{
          width: '30%', 
          marginLeft: 'auto', 
          marginRight: 'auto', 
          marginTop: '5%', 
          height: 'auto', 
          fontSize: 72,
          fontWeight: 'bold',
        }}
      >
        Globe Simulator
      </span>
      <input
        type="text"
        placeholder="Server Address"
        value={serverAddress}
        onChange={(e) => setServerAddress(e.target.value)}
        style={{width: '30%', marginLeft: 'auto', marginRight: 'auto', marginTop: '5%', height: 'auto', fontSize: 32, padding: '4px'}}
      />
      <input
        type="text"
        placeholder="Port"
        value={serverPort}
        onChange={(e) => setServerPort(e.target.value)}
        style={{width: '30%', marginLeft: 'auto', marginRight: 'auto', height: 'auto', fontSize: 32, padding: '4px'}}
      />
      <button onClick={handleSubmit} style={{width: '30%', marginLeft: 'auto', marginRight: 'auto', marginTop: '2%', height: 'auto', fontSize: 32, borderRadius: '8px', backgroundColor: '#1c08f1', border: 'solid 2px white', padding: '4px', cursor: 'pointer'}}>Connect</button>
      <GlassBall x={-100} y={-100} radius={380} from={'#18efff'} to={'#1c08f1'} />
      <GlassBall x={-100} y={-100} rev={true} radius={380} from={'#18efff'} to={'#1c08f1'} />
    </div>
  );
};

export default ServerPage;