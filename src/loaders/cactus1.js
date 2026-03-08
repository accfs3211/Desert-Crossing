import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

let cactusObj = null;

export function loadCactusObj() {
    return new Promise((resolve) => {
        const objLoader = new OBJLoader();
        objLoader.load('assets/cactus1.obj', (model) => {

            model.scale.set(0.5, 0.5, 0.5);
            model.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshPhongMaterial({ color: 0x228b22, shininess: 20 });
                child.castShadow = true;
                child.receiveShadow = true;
            }
            });

            const cactusBounds = new THREE.Box3().setFromObject(model);
            model.position.y -= cactusBounds.min.y;

            cactusObj = new THREE.Group();
            cactusObj.add(model);

            resolve();
        });
    })
    
}

export function createCactus() {
    return cactusObj.clone();
}
