import * as THREE from 'three';
import { useState } from 'react';

function Base({
  startLatLon,                // [lon, lat] in degrees
  radius = 2,                 // globe radius
  color="grey",
}) {
  const [exploded, setExploded] = useState(false);

  function sphericalToCartesian(startLatLon, radius) {
    if (!startLatLon || startLatLon.length !== 2) {
      startLatLon = [0, 0];
    }
    const [lat, lon] = startLatLon;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
  }


  const startPos = sphericalToCartesian(startLatLon, radius);

  return (
    <>
      {!exploded && (
        <mesh position={startPos}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
    </>
  );
}

export default Base;
