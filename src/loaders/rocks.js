import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

let rocksObj = null;

export function loadRocksObj() {
    return new Promise((resolve) => {
        const objLoader = new OBJLoader();

        objLoader.load('assets/rocks.obj', (model) => {

            model.scale.set(0.04, 0.04, 0.04);
            model.rotation.y = -Math.PI / 2;


            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({
                        color: 0x808080,
                        shininess: 5
                    });

                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            model.updateMatrixWorld(true);

            const rockBounds = new THREE.Box3().setFromObject(model);
            const center = rockBounds.getCenter(new THREE.Vector3());

            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= rockBounds.min.y;

            rocksObj = new THREE.Group();
            rocksObj.add(model);

            resolve();
        });
    });
}

export function createRocks() {
    return rocksObj.clone();
}