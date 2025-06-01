import * as THREE from 'three';
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

function Explosion({ position, duration = 1, maxSize = 0.5, onComplete }) {
  const meshRef = useRef();
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    elapsed.current += delta;
    const t = elapsed.current / duration;

    if (t < 1) {
      const scale = THREE.MathUtils.lerp(0.1, maxSize, t);
      meshRef.current.scale.set(scale, scale, scale);
      meshRef.current.material.opacity = 1 - t;
    } else {
      // Remove explosion after done
      onComplete?.();
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshBasicMaterial color="orange" transparent opacity={1} />
    </mesh>
  );
}

export default Explosion;