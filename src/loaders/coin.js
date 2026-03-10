import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

let coinObj = null;

export function loadCoinObj() {
  return new Promise((resolve) => {
    const objLoader = new OBJLoader();
    objLoader.load('assets/coin.obj', (model) => {
      model.scale.set(0.45, 0.45, 0.45);

      model.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshPhongMaterial({
            color: 0xf4c430,
            shininess: 80,
            specular: new THREE.Color(0xffee99)
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      model.updateMatrixWorld(true);
      const coinBounds = new THREE.Box3().setFromObject(model);
      const center = coinBounds.getCenter(new THREE.Vector3());

      // Center the template so setting position places the coin predictably.
      model.position.x -= center.x;
      model.position.y -= center.y;
      model.position.z -= center.z;

      coinObj = new THREE.Group();
      coinObj.add(model);
      resolve();
    });
  });
}

export function createCoin() {
  return coinObj.clone(true);
}
