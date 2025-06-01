import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { drawThreeGeo } from '../utils/threeGeoJSON';
import Missile from './Missile';
import { useMissiles } from '../hooks/useMissiles';

const GeoJSONLayer = ({ url, radius }) => {
  const [geoObject, setGeoObject] = useState(null);

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const geoObj = drawThreeGeo({
          json: data,
          radius,
          materialOptions: { color: 0x80FF80 },
        });
        setGeoObject(geoObj);
      })
      .catch((err) => console.error('Error loading GeoJSON:', err));
  }, [url, radius]);

  return geoObject ? <primitive object={geoObject} /> : null;
};

const WireframeSphere = ({ radius }) => {
  const ref = useRef();

  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const edges = new THREE.EdgesGeometry(geometry, 1);
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
  });

  return <primitive object={new THREE.LineSegments(edges, material)} ref={ref} />;
};


const Globe = () => {
  const radius = 2;
  const [launched, setLaunched] = useState(false);


  const [session, setSession] = useState(null);
  const [name, setName] = useState('Washington');

  useEffect(() => {
    fetch('/session')
      .then(res => res.json())
      .then(data => {
        setSession(data.session);
      });
  }, []); // Connecting to the session

  const { launchMissile } = useMissiles(name, session, (missileData) => {
    // handle incoming missile
    console.log('Missile launched by', missileData.session);
  });

  const handleLaunch = () => {
    // example missile data
    launchMissile({
      startLonLat: [10, 20],
      velocity: [0.1, 0.2, 0.3],
    });
  };

  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ width: '100vw', height: '100vh', background: '#000' }}
      >
        <ambientLight intensity={0.5} />
        <fog attach="fog" color="black" near={1} far={7} />
        <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade />
        <WireframeSphere radius={radius} />
        <GeoJSONLayer url="/geojson/ne_110m_land.json" radius={radius} />
        <OrbitControls enableDamping dampingFactor={0.1} />
        <Missile 
          startLonLat={[75, 42]}
          radius={2}
          initialVelocity={[1.1, 1.4, 0.2]}
          launched={launched}
        />
        <Missile 
          startLonLat={[-75, 42]}
          radius={2}
          initialVelocity={[1.4, 0.9, 0.5]}
          launched={launched}
        />
      </Canvas>
      <button
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          backgroundColor: '#0a0a0a',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
        }}
        onClick={() => {setLaunched(true); handleLaunch()}}
      >
        Launch
      </button>
    </>
  );
};

export default Globe;
