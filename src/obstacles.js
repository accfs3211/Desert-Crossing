import * as THREE from 'three';
import { loadCactusObj, createCactus } from "./loaders/cactus1";
import { loadRocksObj, createRocks } from './loaders/rocks';
import { loadCoinObj, createCoin } from './loaders/coin';

// constants from main
const PATH_WIDTH = 8;
const SEGMENT_LENGTH = 24;
const OBSTACLE_OVERLAP_RADIUS = 1.8;
const COIN_SLOTS_PER_SEGMENT = 3;
const COIN_SPAWN_CHANCE = 0.35;
const LANE_X = [-PATH_WIDTH / 3, 0, PATH_WIDTH / 3];

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
    await Promise.all([
        ...obstacleTypes.map(type => type.load()),
        loadCoinObj()
    ]);
}

export function generateObstacles(segment) {

    // remove old obstacles
    if (segment.userData.obstacles){
        segment.userData.obstacles.forEach(obj => {
            segment.remove(obj);
        });
    }

    segment.userData.obstacles = [];

    const OBSTACLES_PER_SEGMENT = 2;
    const spacing = SEGMENT_LENGTH / OBSTACLES_PER_SEGMENT;

    for (let i = 0; i < OBSTACLES_PER_SEGMENT; i++) {
        const type = randomObstacle();

        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 8) {
            attempts++;

            const obstacle = type.create();

            const jitter = spacing * 0.2;
            const z = -SEGMENT_LENGTH + spacing * (i + 0.5) + (Math.random() - 0.5) * jitter;

            const laneIndex = Math.floor(Math.random() * LANE_X.length);
            const x = LANE_X[laneIndex];

            if (overlapsObstacle(x, z, segment.userData.obstacles)) {
                continue;
            }

            obstacle.position.set(x, 0, z);
            obstacle.rotation.y = Math.random() * Math.PI * 2;
            obstacle.userData.hitboxShrink = new THREE.Vector3(0.12, 0.06, 0.12);

            segment.add(obstacle);
            segment.userData.obstacles.push(obstacle);
            placed = true;
        }
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

function overlapsObstacle(x, z, obstacles) {
    for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        const dx = x - obstacle.position.x;
        const dz = z - obstacle.position.z;
        if ((dx * dx + dz * dz) < (OBSTACLE_OVERLAP_RADIUS * OBSTACLE_OVERLAP_RADIUS)) {
            return true;
        }
    }
    return false;
}

export function generateCoins(segment) {
    if (segment.userData.coins) {
        segment.userData.coins.forEach(coin => segment.remove(coin));
    }
    segment.userData.coins = [];

    const obstacles = segment.userData.obstacles || [];
    const spacing = SEGMENT_LENGTH / COIN_SLOTS_PER_SEGMENT;

    for (let i = 0; i < COIN_SLOTS_PER_SEGMENT; i++) {
        if (Math.random() > COIN_SPAWN_CHANCE) continue;

        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 8) {
            attempts++;

            const jitter = spacing * 0.45;
            const z = -SEGMENT_LENGTH + spacing * (i + 0.5) + (Math.random() - 0.5) * jitter;
            const laneIndex = Math.floor(Math.random() * LANE_X.length);
            const x = LANE_X[laneIndex];

            if (overlapsObstacle(x, z, obstacles)) continue;

            const coin = createCoin();
            coin.position.set(x, 1.25, z);
            coin.rotation.y = Math.random() * Math.PI * 2;
            coin.userData.isCoin = true;
            coin.userData.collected = false;
            coin.userData.hitboxShrink = new THREE.Vector3(0.05, 0.05, 0.05);

            segment.add(coin);
            segment.userData.coins.push(coin);
            placed = true;
        }
    }
}
