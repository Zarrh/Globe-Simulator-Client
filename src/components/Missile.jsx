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


function computeVelocityVector(launchPoint, velocityMagnitude, azimuthDeg, elevationDeg, startLon) {
  const up = launchPoint.clone().normalize();

  // console.log(startLon)

  // Global Z-axis
  const globalZ = new THREE.Vector3(0, 0, 1);

  // North vector: project global Z onto the tangent plane at launchPoint
  const north = globalZ.clone().sub(up.clone().multiplyScalar(globalZ.dot(up))).normalize();

  // East vector: perpendicular to both up and north
  const east = new THREE.Vector3().crossVectors(north, up).normalize();

  // Convert angles to radians
  const azimuth = THREE.MathUtils.degToRad(azimuthDeg+94-startLon); // 94...
  const elevation = THREE.MathUtils.degToRad(elevationDeg);

  const vHorizontal = velocityMagnitude * Math.cos(elevation);
  const vVertical = velocityMagnitude * Math.sin(elevation);

  const velocity = new THREE.Vector3();
  velocity.add(north.clone().multiplyScalar(vHorizontal * Math.cos(azimuth)));
  velocity.add(east.clone().multiplyScalar(vHorizontal * Math.sin(azimuth)));
  velocity.add(up.clone().multiplyScalar(vVertical));

  return velocity;
}


function Missile({
  startLatLon,
  radius = 2,
  initialVelocity = [0.5, 0.5, 0.5],
  gravity = 9.8 * 6371 / 6371,
  launched,
  lineColor="yellow",
}) {
  const pointRef = useRef();
  const glowRef = useRef();
  const [positions, setPositions] = useState([]);
  const [exploded, setExploded] = useState(false);

  const position = useRef(new THREE.Vector3());
  const velocity = useRef(new THREE.Vector3());
  const stopped = useRef(false);

  const glowTexture = useMemo(() => createRadialGradientTexture(), []);

  const [startTime, setStartTime] = useState(null);
  const [deletionStarted, setDeletionStarted] = useState(false);

  // Reset missile state on launch/startLatLon change
  useEffect(() => {
    const startPos = sphericalToCartesian(startLatLon, radius);
    position.current.copy(startPos);
    velocity.current.set(...computeVelocityVector(startPos, initialVelocity[0], initialVelocity[1], initialVelocity[2], startLatLon[1]));
    stopped.current = false;
    setExploded(false);
    setPositions([startPos.clone()]);
    setStartTime(Date.now());
    setDeletionStarted(false);
  }, [startLatLon, radius, initialVelocity]);

  useEffect(() => {
    if (!launched || stopped.current || exploded) return;

    const intervalId = setInterval(() => {
      const r = position.current.length();
      const g = gravity / (r * r);
      const acceleration = position.current.clone().normalize().multiplyScalar(-g);
      velocity.current.add(acceleration.multiplyScalar(0.016));

      position.current.add(velocity.current.clone().multiplyScalar(0.016));

      if (position.current.lengthSq() < (0.98 * radius) ** 2) {
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


  // Start deleting positions rapidly after 15 seconds
  useEffect(() => {
    if (!launched) return;

    const deletionInterval = setInterval(() => {
      if (!startTime) return;

      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= 7.5) {
        setDeletionStarted(true);
      }
    }, 500);

    return () => clearInterval(deletionInterval);
  }, [launched, exploded, startTime]);

  // Rapidly remove positions from the start once deletion has started
  useEffect(() => {
    if (!deletionStarted) return;

    const rapidDeletion = setInterval(() => {
      setPositions((prev) => {
        if (prev.length > 1) {
          return prev.slice(1); // remove the first point
        } else {
          clearInterval(rapidDeletion);
          return prev;
        }
      });
    }, 16); // ~60fps

    return () => clearInterval(rapidDeletion);
  }, [deletionStarted]);

  return (
    <>
      {positions.length > 1 && (
        <Line
          points={positions.map((pos) => pos.toArray())}
          color={lineColor}
          lineWidth={2}
        />
      )}
      {!exploded && (
        <>
          {/* Core red sphere */}
          <mesh ref={pointRef}>
            <sphereGeometry args={[0.025, 16, 16]} />
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