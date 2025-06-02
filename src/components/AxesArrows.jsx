import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { ArrowHelper } from 'three';

function AxesArrows() {
  return (
    <Canvas camera={{ position: [2, 2, 2], fov: 50 }}>
      <ambientLight />
      <group>
        {/* X Axis Arrow */}
        <primitive object={new ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0xff0000)} />
        {/* Y Axis Arrow */}
        <primitive object={new ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0x00ff00)} />
        {/* Z Axis Arrow */}
        <primitive object={new ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 1, 0x0000ff)} />
      </group>
    </Canvas>
  );
};

export default AxesArrows;