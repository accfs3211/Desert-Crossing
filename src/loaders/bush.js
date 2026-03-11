import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

let bushObj = null;

export function loadBushObj() {
    return new Promise((resolve) => {
        const objLoader = new OBJLoader();
        objLoader.load('assets/bush.obj', (model) => {

            model.scale.set(0.15, 0.15, 0.15);
            model.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshPhongMaterial({ color: 0x754701 });
                child.castShadow = true;
                child.receiveShadow = true;
            }
            });

            bushObj = new THREE.Group();
            bushObj.add(model);

            resolve();
        });
    })
    
}

export function createBush() {
    return bushObj.clone();
}
