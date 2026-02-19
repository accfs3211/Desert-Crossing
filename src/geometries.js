import * as THREE from 'three';

/**
 * terrain height used by for generating a height at a given coordinate that forms a dune like terrain
 * z terms are periodic by segment length so adjacent segments tile seamlessly.
 */
export function sampleTerrainHeight(x, z, segmentLength, flattenCenterHalf = 0, flattenBlend = 0) {
  const k1 = (2 * Math.PI) / segmentLength;
  const k2 = (4 * Math.PI) / segmentLength;
  const k3 = (6 * Math.PI) / segmentLength;

  let h =
    0.9 * Math.sin(0.055 * x + k1 * z) +
    0.55 * Math.cos(0.035 * x - k2 * z) +
    0.3 * Math.sin(0.1 * x + 0.5 * k2 * z) +
    // extra criss-cross waves
    0.35 * Math.sin(0.07 * x - k1 * z) +
    0.25 * Math.cos(0.045 * x + k3 * z);

  if (flattenCenterHalf > 0 && flattenBlend > 0) {
    const d = Math.abs(x) - flattenCenterHalf;
    const t = Math.max(0, Math.min(1, d / flattenBlend));
    const smooth = t * t * (3 - 2 * t); // smoothstep
    h *= smooth;
  }

  return h;
}

// create one wavy ground segment in XZ plane (Y up).
export function createWavyGroundGeometry(width, depth, segX, segZ, flattenCenterHalf, flattenBlend ) {
  const positions = [];
  const indices = [];

  for (let iz = 0; iz <= segZ; iz++) {
    for (let ix = 0; ix <= segX; ix++) {
      const x = (ix / segX - 0.5) * width;
      const z = (iz / segZ - 0.5) * depth;
      const y = sampleTerrainHeight(x, z, depth, flattenCenterHalf, flattenBlend);
      positions.push(x, y, z);
    }
  }

  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * (segX + 1) + ix;
      const b = a + 1;
      const c = a + (segX + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
