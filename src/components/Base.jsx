import * as THREE from 'three';
import { useState, useMemo } from 'react';
import { hex2RGBA } from '../functions';


function createRadialGradientTexture(color) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const transparentColor = hex2RGBA(color, 0.0);

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size * 0.2,
  );
  gradient.addColorStop(0, color);  // bright red center
  gradient.addColorStop(1, transparentColor);    // fade to transparent

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}


function Base({
  startLatLon,                // [lon, lat] in degrees
  radius = 2,                 // globe radius
  color="grey",
  highlighted=false,
}) {
  const [exploded, setExploded] = useState(false);

  const glowTexture = useMemo(() => {
    if (highlighted) {
      return createRadialGradientTexture(color);
    }
    return null;
  }, [highlighted, color]);

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
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
      {!exploded && highlighted && (
        <sprite position={startPos} scale={[0.5, 0.5, 0.5]}>
          <spriteMaterial
            map={glowTexture}
            transparent={true}
            opacity={0.75}
            depthWrite={false}
          />
        </sprite>
      )}
    </>
  );
}

export default Base;
