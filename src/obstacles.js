import * as THREE from 'three';
import { loadCactusObj, createCactus } from "./loaders/cactus1";
import { loadRocksObj, createRocks } from './loaders/rocks';
import { loadRocks2Obj, createRocks2 } from './loaders/rocks2';
import { loadRocks3Obj, createRocks3 } from './loaders/rocks3';

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
        name: 'rocks1',
        spawnChance: 0.1,
        load: loadRocksObj,
        create: createRocks
    },
    {
        name: 'rocks2',
        spawnChance: 0.2,
        load: loadRocks2Obj,
        create: createRocks2
    },
    {
        name: 'rocks3',
        spawnChance: 0.2,
        load: loadRocks3Obj,
        create: createRocks3
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

    const OBSTACLE_MIN = 2;
    const OBSTACLE_MAX = 3;

    const OBSTACLES_PER_SEGMENT = Math.floor(Math.random() * (OBSTACLE_MAX - OBSTACLE_MIN + 1)) + OBSTACLE_MIN;
    const spacing = SEGMENT_LENGTH / OBSTACLES_PER_SEGMENT;

    for (let i = 0; i < OBSTACLES_PER_SEGMENT; i++) {

        const type = randomObstacle();
        const obstacle = type.create();

        const jitter = spacing * 0.6;
        const z = -SEGMENT_LENGTH + spacing * (i + 0.5) + (Math.random() - 0.5) * jitter;

        const x = (Math.random() - 0.5) * PATH_WIDTH * 0.8;

        obstacle.position.set(x, 0, z);

        obstacle.userData.hitboxShrink = new THREE.Vector3(0.12, 0.06, 0.12);

        segment.add(obstacle);
        segment.userData.obstacles.push(obstacle);
    }
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