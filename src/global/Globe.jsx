import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { drawThreeGeo } from '../utils/threeGeoJSON';
import Missile from '../components/Missile';
import Base from '../components/Base';
import { areEqual } from '../functions';
import { states } from '../data';

// Component to load and render GeoJSON data on the sphere
const GeoJSONLayer = ({ url, radius }) => {
  const [geoObject, setGeoObject] = useState(null);

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        // Use drawThreeGeo to convert GeoJSON to a Three.js object
        const geoObj = drawThreeGeo({
          json: data,
          radius,
          materialOptions: { color: 0x80FF80 }, // Green color for land
        });
        setGeoObject(geoObj);
      })
      .catch((err) => console.error('Error loading GeoJSON:', err));
  }, [url, radius]); // Re-run if URL or radius changes

  return geoObject ? <primitive object={geoObject} /> : null;
};

// Component to render a wireframe sphere (the globe itself)
const WireframeSphere = ({ radius }) => {
  const ref = useRef();

  const geometry = new THREE.SphereGeometry(radius, 32, 32); // Create sphere geometry
  const edges = new THREE.EdgesGeometry(geometry, 1); // Get edges for wireframe
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff, // White color for wireframe
    transparent: true,
    opacity: 0.3, // Semi-transparent
  });

  return <primitive object={new THREE.LineSegments(edges, material)} ref={ref} />;
};

// Main Globe component
const Globe = ({ selectedState, missiles, bases, basePosition}) => {
  const radius = 2; // Radius of the globe

  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }} // Camera position and field of view
        style={{ width: '100vw', height: '100vh', background: '#000' }} // Full screen black background
      >
        <ambientLight intensity={0.5} /> {/* Soft ambient light */}
        <fog attach="fog" color="black" near={1} far={7} /> {/* Fog effect */}
        <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade /> {/* Background stars */}
        <WireframeSphere radius={radius} /> {/* The globe wireframe */}
        <GeoJSONLayer url="/geojson/ne_110m_land.json" radius={radius} /> {/* Landmasses */}
        <OrbitControls enableDamping dampingFactor={0.1} /> {/* User controls for orbiting the globe */}

        {/* Render all active missiles */}
        {missiles.map((missile, index) => (
          <Missile
            key={index} // Unique key for each missile
            startLatLon={missile.missileData.startLatLon} // Use missileData from the server payload
            radius={radius}
            initialVelocity={missile.missileData.initialVelocity} // Use missileData from the server payload
            launched={true} // Indicate that the missile is launched
          />
        ))}

        {/* Render all player bases */}
        {bases.filter((base) => !areEqual(base.startLatLon, basePosition)).map((base, index) => (
          <Base
            key={index} // Unique key for each base
            startLatLon={base.startLatLon}
            radius={radius}
            color={states.find(state => state.name === base.name)?.color ?? "grey"}
          />
        ))}
        {basePosition && (
          <Base
            startLatLon={basePosition}
            radius={radius}
            color={states.find(state => state.name === selectedState)?.color ?? "blue"}
          />
        )}
      </Canvas>
    </>
  );
};

export default Globe;
