import * as THREE from 'three';
import { loadCactusObj, createCactus } from "./loaders/cactus1";
import { loadCactus2Obj, createCactus2 } from './loaders/catus2';
import { loadRocksObj, createRocks } from './loaders/rocks';
import { loadRocks2Obj, createRocks2 } from './loaders/rocks2';
import { loadRocks3Obj, createRocks3 } from './loaders/rocks3';
import { loadCoinObj, createCoin } from './loaders/coin';
import { loadTumbleweedObj, createTumbleweed } from './loaders/tumbleweed';
import { loadBushObj, createBush } from './loaders/bush';

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
        spawnChance: 0.30,
        load: loadCactusObj,
        create: createCactus
    },
    {
        name: 'rocks1',
        spawnChance: 0.08,
        load: loadRocksObj,
        create: createRocks
    },
    {
        name: 'rocks2',
        spawnChance: 0.1,
        load: loadRocks2Obj,
        create: createRocks2
    },
    {
        name: 'rocks3',
        spawnChance: 0.1,
        load: loadRocks3Obj,
        create: createRocks3
    },
    {
        name: 'tumbleweed',
        spawnChance: 0.2,
        load: loadTumbleweedObj,
        create: createTumbleweed
    },
    {
        name: 'bush',
        spawnChance: 0.15,
        load: loadBushObj,
        create: createBush
    },
    {
        name: 'cactus2',
        spawnChance: 0.2,
        load: loadCactus2Obj,
        create: createCactus2
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

    const OBSTACLE_MIN = 2;
    const OBSTACLE_MAX = 3;

    const OBSTACLES_PER_SEGMENT = Math.floor(Math.random() * (OBSTACLE_MAX - OBSTACLE_MIN + 1)) + OBSTACLE_MIN;
    const spacing = SEGMENT_LENGTH / OBSTACLES_PER_SEGMENT;

    for (let i = 0; i < OBSTACLES_PER_SEGMENT; i++) {
        const type = randomObstacle();

        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 8) {
            attempts++;

            const obstacle = type.create();
            obstacle.userData.type = type.name;

            const jitter = spacing * 0.2;
            const z = -SEGMENT_LENGTH + spacing * (i + 0.5) + (Math.random() - 0.5) * jitter;

            const laneIndex = Math.floor(Math.random() * LANE_X.length);
            const x = LANE_X[laneIndex];

            if (overlapsObstacle(x, z, segment.userData.obstacles)) {
                continue;
            }

            if (type.name != "cactus2"){
                obstacle.rotation.y = Math.random() * Math.PI * 2;
            } else {
                const isFlipped = Math.random() > 0.5;
                obstacle.rotation.y = isFlipped ? Math.PI : 0;
            }
            
            obstacle.position.set(x, 0, z);
            if (type.name == "tumbleweed") {
                obstacle.position.set(x, 1, z);
             
                obstacle.userData.baseLaneX = x;
                obstacle.userData.timeOffset = Math.random() * Math.PI * 2;
                obstacle.userData.tumbleTime = 0;
            }
            
            obstacle.userData.hitboxShrink = new THREE.Vector3(
                obstacle.scale.x * 0.3,
                obstacle.scale.y * 0.3,
                obstacle.scale.z * 0.3
            );

            segment.add(obstacle);
            segment.userData.obstacles.push(obstacle);
            placed = true;
        }
    }
}

export function updateObstacles(floorSegments, time, dt) {
    for (const seg of floorSegments) {
        const obstacles = seg.userData.obstacles || [];
        for (const obstacle of obstacles) {
            if (obstacle.userData.type === "tumbleweed") {
                const offset = obstacle.userData.timeOffset || 0;
                const amplitude = 5.0;
                const speed = 1.0;
                const baseX = obstacle.userData.baseLaneX ?? obstacle.position.x;
                obstacle.userData.tumbleTime = (obstacle.userData.tumbleTime || 0) + (dt || 0);
                const localTime = obstacle.userData.tumbleTime + offset;
                obstacle.position.x = baseX + Math.sin(localTime * speed) * amplitude;
                obstacle.rotation.z += 0.08;
            }
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
