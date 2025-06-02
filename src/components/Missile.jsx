import * as THREE from 'three';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Line } from '@react-three/drei';
import Explosion from './Explosion';


function createRadialGradientTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');  // bright red center
  gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');    // fade to transparent

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}


function Missile({
  startLatLon,
  radius = 2,
  initialVelocity = [0.5, 0.5, 0.5],
  gravity = 9.8 * 6371 / 6371,
  launched,
}) {
  const pointRef = useRef();
  const glowRef = useRef();
  const [positions, setPositions] = useState([]);
  const [exploded, setExploded] = useState(false);

  const position = useRef(new THREE.Vector3());
  const velocity = useRef(new THREE.Vector3());
  const stopped = useRef(false);

  const glowTexture = useMemo(() => createRadialGradientTexture(), []);

  // Convert spherical coordinates to cartesian
  function sphericalToCartesian(startLatLon, radius) {
    if (!startLatLon || startLatLon.length !== 2) {
      console.warn("Defaulting coordinates");
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

  // Reset missile state on launch/startLatLon change
  useEffect(() => {
    const startPos = sphericalToCartesian(startLatLon, radius);
    position.current.copy(startPos);
    velocity.current.set(...initialVelocity);
    stopped.current = false;
    setExploded(false);
    setPositions([startPos.clone()]);
  }, [startLatLon, radius, initialVelocity]);

  useEffect(() => {
    if (!launched || stopped.current || exploded) return;

    const intervalId = setInterval(() => {
      const r = position.current.length();
      const g = gravity / (r * r);
      const acceleration = position.current.clone().normalize().multiplyScalar(-g);
      velocity.current.add(acceleration.multiplyScalar(0.016));

      position.current.add(velocity.current.clone().multiplyScalar(0.016));

      if (position.current.lengthSq() < (0.95 * radius) ** 2) {
        stopped.current = true;
        setExploded(true);
        clearInterval(intervalId);
        return;
      }

      if (pointRef.current) {
        pointRef.current.position.copy(position.current);
      }
      if (glowRef.current) {
        glowRef.current.position.copy(position.current);
      }

      setPositions((prev) => {
        const lastPos = prev[prev.length - 1];
        if (!lastPos || lastPos.distanceToSquared(position.current) > 0.0001) {
          return [...prev, position.current.clone()];
        }
        return prev;
      });
    }, 16); // approx. 60fps

    return () => clearInterval(intervalId);
  }, [launched, radius, gravity, exploded]);

  return (
    <>
      {positions.length > 1 && (
        <Line
          points={positions.map((pos) => pos.toArray())}
          color="yellow"
          lineWidth={2}
        />
      )}
      {!exploded && (
        <>
          {/* Core red sphere */}
          <mesh ref={pointRef}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="red" />
          </mesh>

          {/* Gradient glow */}
          <sprite ref={glowRef} scale={[0.5, 0.5, 0.5]}>
            <spriteMaterial
              map={glowTexture}
              transparent={true}
              opacity={0.75}
              depthWrite={false}
            />
          </sprite>
        </>
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