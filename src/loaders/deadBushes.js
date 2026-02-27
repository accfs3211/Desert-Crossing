import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let deadBushModels = [];
const UPRIGHT_FIX_X = -Math.PI / 2;

function makeMaterialDull(material) {
    if (!material) return;

    if ('roughness' in material) material.roughness = Math.max(material.roughness ?? 0, 0.95);
    if ('metalness' in material) material.metalness = 0;
    if ('shininess' in material) material.shininess = 2;
    if ('specular' in material && material.specular?.setScalar) material.specular.setScalar(0.05);
}

function hasMeshDescendant(node) {
    if (node.isMesh) return true;
    for (const child of node.children) {
        if (hasMeshDescendant(child)) return true;
    }
    return false;
}

function getBushVariantSources(root) {
    let level = root.children.filter((child) => hasMeshDescendant(child));
    if (level.length === 0) return [root];

    // If the file has a single container node, keep drilling until we hit the
    // first level that actually contains multiple mesh-bearing children.
    while (level.length === 1) {
        const only = level[0];
        const nextLevel = only.children.filter((child) => hasMeshDescendant(child));
        if (nextLevel.length === 0) break;
        level = nextLevel;
    }

    return level.length > 0 ? level : [root];
}

export function loadDeadBushObj(callback) {
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
        'assets/dead_bushes.glb',
        (gltf) => {
            const root = gltf.scene;
            const sources = getBushVariantSources(root);

            deadBushModels = sources.map((source) => {
                const bush = source.clone(true);
                bush.scale.set(1.2, 1.2, 1.2);
                bush.rotation.x = UPRIGHT_FIX_X;

                bush.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (Array.isArray(child.material)) {
                            child.material.forEach((mat) => {
                                makeMaterialDull(mat);
                                mat.needsUpdate = true;
                            });
                        } else if (child.material) {
                            makeMaterialDull(child.material);
                            child.material.needsUpdate = true;
                        }
                    }
                });

                const bushBounds = new THREE.Box3().setFromObject(bush);
                bush.position.y -= bushBounds.min.y;
                return bush;
            });

            if (callback) callback();
        },
        undefined,
        (err) => {
            console.error('Failed to load dead_bushes.glb', err);
        }
    );
}

export function createDeadBush(index = 0) {
    if (deadBushModels.length === 0) return null;
    const safeIndex = ((index % deadBushModels.length) + deadBushModels.length) % deadBushModels.length;
    return deadBushModels[safeIndex].clone(true);
}

export function createDeadBushArray() {
    return deadBushModels.map((bush) => bush.clone(true));
}

export function getDeadBushCount() {
    return deadBushModels.length;
}
