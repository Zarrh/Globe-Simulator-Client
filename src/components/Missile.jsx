import * as THREE from 'three';
import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import Explosion from './Explosion';

function Missile({
  startLonLat,                // [lon, lat] in degrees
  radius = 2,                 // globe radius
  initialVelocity = [0.5, 0.5, 0.5],  // x, y, z velocity components
  gravity = 9.8 * 6371 / 6371,    // Earth's gravity scaled to unit sphere
  launched,
}) {
  const pointRef = useRef();
  const [positions, setPositions] = useState([]);
  const [exploded, setExploded] = useState(false);

  const sphericalToCartesian = ([lon, lat], r) => {
    const lonRad = THREE.MathUtils.degToRad(lon);
    const latRad = THREE.MathUtils.degToRad(lat);
    const x = r * Math.cos(latRad) * Math.cos(lonRad);
    const y = r * Math.sin(latRad);
    const z = r * Math.cos(latRad) * Math.sin(lonRad);
    return new THREE.Vector3(x, y, z);
  };

  const startPos = sphericalToCartesian(startLonLat, radius);

  const position = useRef(startPos.clone());
  const velocity = useRef(new THREE.Vector3(...initialVelocity));
  const stopped = useRef(false);


  useFrame((_, delta) => {
    if (!launched || stopped.current || exploded) return;

    const dt = delta;

    // Calculate gravity towards center of sphere
    const r = position.current.length();
    const g = gravity / (r * r);
    const acceleration = position.current.clone().normalize().multiplyScalar(-g);

    // Update velocity
    velocity.current.add(acceleration.multiplyScalar(dt));

    // Update position
    position.current.add(velocity.current.clone().multiplyScalar(dt));

    if (position.current.lengthSq() < (0.95 * radius) ** 2) {
      stopped.current = true;
      setExploded(true);
      return;
    }

    // Update mesh position
    if (pointRef.current) {
      pointRef.current.position.copy(position.current);
    }

    // Append to trajectory
    setPositions((prev) => [...prev, position.current.clone()]);
  });

  return (
    <>
      {positions.length > 1 && (
        <Line
          points={positions.map((pos) => pos.toArray())}
          color="yellow"
          lineWidth={2}
        />
      )}
      {launched && !exploded && (
        <mesh ref={pointRef}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}
      {/* Explosion */}
      {exploded && (
        <Explosion
          position={position.current.clone()}
          duration={2}
          maxSize={3}
        />
      )}
    </>
  );
}

export default Missile;
