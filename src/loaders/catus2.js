import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

let cactusObj = null;

export function loadCactus2Obj() {
    return new Promise((resolve) => {
        const objLoader = new OBJLoader();
        objLoader.load('assets/cactus2.obj', (model) => {

            model.scale.set(1, 1, 1);
            model.rotation.y = Math.PI/2;
            model.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshPhongMaterial({ color: 0x50b033, side: THREE.DoubleSide });
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

export function createCactus2() {
    return cactusObj.clone();
}
