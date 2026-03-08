import * as THREE from 'three';
import { loadCactusObj, createCactus } from "./loaders/cactus1";
import { loadRocksObj, createRocks } from './loaders/rocks';

// constants from main
const PATH_WIDTH = 8;
const SEGMENT_LENGTH = 24;

const obstacleTypes = [
    {
        name: 'cactus',
        spawnChance: 0.5,
        load: loadCactusObj,
        create: createCactus
    },
    {
        name: 'rocks',
        spawnChance: 0.5,
        load: loadRocksObj,
        create: createRocks
    }
]

export async function loadAllObstacles() {
    await Promise.all(obstacleTypes.map(type => type.load()));
}

export function generateObstacles(segment) {
    // remove old obstacles
    if (segment.userData.obstacles){
        segment.userData.obstacles.forEach(obj => {
            segment.remove(obj);
        });
    }
    segment.userData.obstacles = []; 

    const type = randomObstacle();
    const obstacle = type.create();

    obstacle.position.set((Math.random() - 0.5) * PATH_WIDTH * 0.8, 0, -SEGMENT_LENGTH / 2);
    obstacle.userData.hitboxShrink = new THREE.Vector3(0.12, 0.06, 0.12);

    segment.add(obstacle);
    segment.userData.obstacles.push(obstacle);
}

function randomObstacle() {
    const totalWeight = obstacleTypes.reduce((sum, type) => sum + type.spawnChance, 0);
    let r = Math.random() * totalWeight;

    for (const type of obstacleTypes) {
        r -= type.spawnChance;
        if (r <= 0) return type;
    }

    return obstacleTypes[0];
}