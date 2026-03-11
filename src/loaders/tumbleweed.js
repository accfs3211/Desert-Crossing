import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

let tumbleweedObj = null;

export function loadTumbleweedObj() {
    return new Promise((resolve) => {
        const objLoader = new OBJLoader();
        objLoader.load('assets/tumbleweed.obj', (model) => {

            model.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshPhongMaterial({ color: 0xffef9c });
                child.castShadow = true;
                child.receiveShadow = true;
            }
            });

            const tumbleweedBounds = new THREE.Box3().setFromObject(model);

            const center = new THREE.Vector3();
            tumbleweedBounds.getCenter(center);
            model.position.sub(center);

            tumbleweedBounds.min.lerp(center, 0.2);
            tumbleweedBounds.max.lerp(center, 0.2);

            tumbleweedObj = new THREE.Group();
            tumbleweedObj.add(model);

            resolve();
        });
    })
    
}

export function createTumbleweed() {
    return tumbleweedObj.clone();
}
