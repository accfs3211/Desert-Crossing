import * as THREE from 'three';
import { createWavyGroundGeometry, sampleTerrainHeight } from './geometries.js';
import { loadCactusObj, createCactus } from './loaders/cactus1.js';
import { loadDeadBushObj, createDeadBush, getDeadBushCount } from './loaders/deadBushes.js';
import { Dino } from './loaders/dino.js'
import { createGameState } from './state.js';
import { createCollisionSystem } from './collision.js';
import { loadAllObstacles, generateObstacles, generateCoins } from './obstacles.js';
import { createAudioSystem } from './audio.js';

// scene, camera, renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky blue

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(7, 10, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// lights 
const ambient = new THREE.AmbientLight(0xf7c592, 0.8);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);

dir.position.set(22, 36, 14);
dir.target.position.set(0, 0, -8);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
dir.shadow.camera.near = 5;
dir.shadow.camera.far = 80;
dir.shadow.camera.left = -35;
dir.shadow.camera.right = 35;
dir.shadow.camera.top = 35;
dir.shadow.camera.bottom = -35;
scene.add(dir);
scene.add(dir.target);
const fill = new THREE.DirectionalLight(0xaaccff, 0.35);
fill.position.set(5, 8, -5);
scene.add(fill);

// create dinosaur
const DINO_SPAWN_Y = 4.5;
const audioSystem = createAudioSystem();
audioSystem.enableAutoplayUnlock();

const dino = new Dino({
  spawnY: DINO_SPAWN_Y,
  onJump: () => audioSystem.playJump()
});
dino.load(scene);

// moving world 
const SEGMENT_LENGTH = 24; // length  of one scrolling terrain segment in the z direction 
const GROUND_WIDTH = 500; // total terrain width across x
const PATH_WIDTH = 8; // width of the central playable path
const NUM_SEGMENTS = 16; // number of terrain segments kept in rotation
const BASE_FLOOR_SPEED = 7; // base speed segments move toward the camera
const WRAP_THRESHOLD = SEGMENT_LENGTH + 15; // z position where a segment is recycled to the back
const TERRAIN_FLAT_HALF = PATH_WIDTH / 2 + 0.8; // Half-width of center area flattened for gameplay
const TERRAIN_FLAT_BLEND = 2.4; // Blend distance from flat path to full dune height

const SAND_COLOR = 0xd4b483;
const groundMat = new THREE.MeshPhongMaterial({ color: SAND_COLOR, shininess: 8 });
const pathMat = new THREE.MeshPhongMaterial({ color: 0xc4a46c, shininess: 8 });
const segmentMarkerMat = new THREE.MeshPhongMaterial({ color: 0xffdd44, shininess: 60 }); 
const groundGeo = createWavyGroundGeometry(
  GROUND_WIDTH,
  SEGMENT_LENGTH,
  140,
  28,
  TERRAIN_FLAT_HALF,
  TERRAIN_FLAT_BLEND
);

const floorSegments = [];
//const obstacles = []; // to be generalized for multiple obstacle types later
for (let i = 0; i < NUM_SEGMENTS; i++) {
  const seg = new THREE.Group();

  // Wide ground plane
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  seg.add(ground);

  // that dino can move on 
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(PATH_WIDTH, SEGMENT_LENGTH),
    pathMat
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.03;
  path.receiveShadow = true;
  seg.add(path);

  // for storing the segment's obstacles
  seg.userData.obstacles = [];

  seg.position.z = -i * SEGMENT_LENGTH;
  scene.add(seg);
  floorSegments.push(seg);
}

// add cactus to the floor segments
// loadCactusObj(() => {
//   for (let i = 0; i < floorSegments.length; i++) {
//     const cactus = createCactus();
//     cactus.position.set(0, 0, -SEGMENT_LENGTH / 2); // position fixed for now
//     cactus.userData.obstacleType = 'cactus';
//     cactus.userData.hitboxShrink = new THREE.Vector3(0.12, 0.06, 0.12);
//     floorSegments[i].add(cactus);
//     obstacles.push(cactus);
//   }
// });

// load obstacles in from obstacles.js
await loadAllObstacles();

floorSegments.forEach((seg, index) => {
  if (index >= 1 && index < floorSegments.length - 1) {
    generateObstacles(seg);
    generateCoins(seg);
  }
});

// add dead bushes to floor segments
loadDeadBushObj(() => {
  const bushCount = getDeadBushCount();
  if (bushCount === 0) return;

  for (let i = 0; i < floorSegments.length; i++) {
    const seg = floorSegments[i];
    const rng = mulberry32(i * 1879 + 911);

    for (let xi = -SCATTER_HALF; xi < SCATTER_HALF; xi++) {
      for (let zi = 0; zi < SEGMENT_LENGTH; zi++) {
        if (Math.abs(xi + 0.5) < PATH_HALF) continue; // skip path area
        if (rng() > BUSH_SPAWN_CHANCE) continue; // 1 in 300 spawn chance

        const bushIdx = Math.floor(rng() * bushCount);
        const bush = createDeadBush(bushIdx);
        if (!bush) continue;

        const px = xi + rng();
        const pz = -SEGMENT_LENGTH / 2 + zi + rng();
        const py = sampleTerrainHeight(
          px,
          pz,
          SEGMENT_LENGTH,
          TERRAIN_FLAT_HALF,
          TERRAIN_FLAT_BLEND
        );

        bush.position.set(px, py, pz);
        bush.rotation.set(0, rng() * Math.PI * 2, 0); // keep bushes upright
        const bushScale = (0.85 + rng() * 0.35) * 2;
        bush.scale.multiplyScalar(bushScale);
        seg.add(bush);
      }
    }
  }
});

// Simple seeded PRNG to randomly scatter pebbles on the terrain 
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 5 pebble geometries
const pebbleGeos = [
  // single flat stone
  new THREE.BoxGeometry(0.2, 0.06, 0.15),
  // small upright rock
  new THREE.BoxGeometry(0.1, 0.15, 0.1),
  // wide flat slab
  new THREE.BoxGeometry(0.3, 0.04, 0.2),
  // tiny cube
  new THREE.BoxGeometry(0.08, 0.08, 0.08),
  // elongated stone
  new THREE.BoxGeometry(0.25, 0.05, 0.08),
];

const pebbleMat = new THREE.MeshPhongMaterial({ color: 0xa09080, shininess: 15 });
const SCATTER_HALF = 40; // scatter pebbles +-40 units from center
const PATH_HALF = PATH_WIDTH / 2 + 0.5; // keep pebbles off the path
const BUSH_SPAWN_CHANCE = 1 / 300;
const COIN_POINTS = 20;
const COIN_SPIN_SPEED = 3.6; // radians per second
const DAY_NIGHT_INTERVAL = 20; // seconds
const THEME_TRANSITION_DURATION = 2.5; // seconds
const SPEED_UP_INTERVAL_SECONDS = 40; // every full day+night cycle
const SPEED_UP_MULTIPLIER = 1.5;

for (let si = 0; si < floorSegments.length; si++) {
  const seg = floorSegments[si];
  const rng = mulberry32(si * 7919 + 137);

  for (let xi = -SCATTER_HALF; xi < SCATTER_HALF; xi++) {
    for (let zi = 0; zi < SEGMENT_LENGTH; zi++) {
      if (Math.abs(xi + 0.5) < PATH_HALF) continue; // skip path area
      if (rng() > 0.01) continue; // 1% chance to spawn pebble for given segment coord 

      const geoIdx = Math.floor(rng() * pebbleGeos.length);
      const px = xi + rng();
      const pz = -SEGMENT_LENGTH / 2 + zi + rng();
      const py =
        sampleTerrainHeight(
          px,
          pz,
          SEGMENT_LENGTH,
          TERRAIN_FLAT_HALF,
          TERRAIN_FLAT_BLEND
        ) + 0.02;
      const pebble = new THREE.Mesh(pebbleGeos[geoIdx], pebbleMat);
      pebble.position.set(
        px,
        py,
        pz
      );
      pebble.rotation.y = rng() * Math.PI * 2; // random rotation
      seg.add(pebble);
    }
  }
}

// animation
const clock = new THREE.Clock();
let scrollOffset = 0;
let dayNightTimer = 0;
let targetNight = false;
let themeBlend = 0; // 0 day, 1 night
let survivalTime = 0;
let dayCount = 0;
let nextSpeedUpAt = SPEED_UP_INTERVAL_SECONDS;
let currentFloorSpeed = BASE_FLOOR_SPEED;
const TOTAL_LENGTH = NUM_SEGMENTS * SEGMENT_LENGTH;
const collisionSystem = createCollisionSystem({
  // tightened player hitbox (to reduce false positives)
  playerShrink: new THREE.Vector3(0.2, 0.15, 0.2)
});

const DAY_THEME = {
  sky: 0x87ceeb,
  ground: 0xd4b483,
  path: 0xc4a46c,
  pebbles: 0xa09080,
  ambientColor: 0xf7c592,
  ambientIntensity: 0.8,
  dirColor: 0xffffff,
  dirIntensity: 0.95,
  fillColor: 0xaaccff,
  fillIntensity: 0.35
};

const NIGHT_THEME = {
  sky: 0x050b1f,
  ground: 0x2a3550,
  path: 0x3a4764,
  pebbles: 0x58657d,
  ambientColor: 0x3f4d71,
  ambientIntensity: 0.44,
  dirColor: 0x8fa0d8,
  dirIntensity: 0.62,
  fillColor: 0x4f5d86,
  fillIntensity: 0.28
};

const themeColorA = new THREE.Color();
const themeColorB = new THREE.Color();

function lerpHexColor(dayHex, nightHex, t) {
  themeColorA.setHex(dayHex);
  themeColorB.setHex(nightHex);
  return themeColorA.lerp(themeColorB, t);
}

function lerpNumber(dayValue, nightValue, t) {
  return dayValue + (nightValue - dayValue) * t;
}

function applyWorldThemeByBlend(t) {
  scene.background.copy(lerpHexColor(DAY_THEME.sky, NIGHT_THEME.sky, t));
  groundMat.color.copy(lerpHexColor(DAY_THEME.ground, NIGHT_THEME.ground, t));
  pathMat.color.copy(lerpHexColor(DAY_THEME.path, NIGHT_THEME.path, t));
  pebbleMat.color.copy(lerpHexColor(DAY_THEME.pebbles, NIGHT_THEME.pebbles, t));

  ambient.color.copy(lerpHexColor(DAY_THEME.ambientColor, NIGHT_THEME.ambientColor, t));
  ambient.intensity = lerpNumber(DAY_THEME.ambientIntensity, NIGHT_THEME.ambientIntensity, t);
  dir.color.copy(lerpHexColor(DAY_THEME.dirColor, NIGHT_THEME.dirColor, t));
  dir.intensity = lerpNumber(DAY_THEME.dirIntensity, NIGHT_THEME.dirIntensity, t);
  fill.color.copy(lerpHexColor(DAY_THEME.fillColor, NIGHT_THEME.fillColor, t));
  fill.intensity = lerpNumber(DAY_THEME.fillIntensity, NIGHT_THEME.fillIntensity, t);
}

applyWorldThemeByBlend(0);

function resetDinoState() {
  dino.y = DINO_SPAWN_Y;
  dino.velocityY = 0;
  dino.isOnGround = dino.y <= 0;
  dino.spaceHeld = false;
  dino.holdTime = 0;
  dino.velocityX = 0;
  dino.airMoveUsed = false;
  dino.currentLane = 1;
  dino.targetLane = 1;
  dino.laneCooldownRemaining = 0;
  if (dino.model) {
    dino.model.position.x = 0;
    dino.model.position.y = DINO_SPAWN_Y + dino.offsetY;
  }
}

function resetGame() {
  scrollOffset = 0;
  dayNightTimer = 0;
  targetNight = false;
  themeBlend = 0;
  survivalTime = 0;
  dayCount = 0;
  nextSpeedUpAt = SPEED_UP_INTERVAL_SECONDS;
  currentFloorSpeed = BASE_FLOOR_SPEED;
  audioSystem.resetForRestart();
  applyWorldThemeByBlend(0);
  resetDinoState();
  resetObstacles();
  for (let i = 0; i < NUM_SEGMENTS; i++) {
    floorSegments[i].position.z = -i * SEGMENT_LENGTH;
  }
  gameState.reset();
}

function resetObstacles(){
  for (let i = 0; i < NUM_SEGMENTS; i++) {
    const seg = floorSegments[i];

    if (i >= 1 && i < floorSegments.length - 1) {
      generateObstacles(seg);
      generateCoins(seg);
    } else {
      if (seg.userData.obstacles) {
        seg.userData.obstacles.forEach(obj => seg.remove(obj));
      }
      seg.userData.obstacles = [];
      if (seg.userData.coins) {
        seg.userData.coins.forEach(coin => seg.remove(coin));
      }
      seg.userData.coins = [];
    }
  }
}

const gameState = createGameState({
  scorePerSecond: 0,
  // restart button in state UI calls back here to reset world
  onRestart: resetGame
});

function animate() {
  if (gameState.isGameOver()) {
    renderer.render(scene, camera);
    return;
  }

  const dt = clock.getDelta();
  survivalTime += dt;
  while (survivalTime >= nextSpeedUpAt) {
    dayCount += 1;
    nextSpeedUpAt += SPEED_UP_INTERVAL_SECONDS;
    currentFloorSpeed *= SPEED_UP_MULTIPLIER;
    audioSystem.setMusicRate(1 + dayCount * 0.08);
    gameState.setDayCount(dayCount);
    const dayWord = dayCount === 1 ? 'day' : 'days';
    gameState.showNotice(`You survived ${dayCount} ${dayWord}! Speed Up!`);
  }
  scrollOffset += currentFloorSpeed * dt;
  dayNightTimer += dt;
  while (dayNightTimer >= DAY_NIGHT_INTERVAL) {
    dayNightTimer -= DAY_NIGHT_INTERVAL;
    targetNight = !targetNight;
  }
  const direction = targetNight ? 1 : -1;
  themeBlend = Math.max(0, Math.min(1, themeBlend + (direction * dt) / THEME_TRANSITION_DURATION));
  applyWorldThemeByBlend(themeBlend);
  gameState.tick(dt);

  // handle dino jump
  dino.update(dt);
  
  // scroll floor segments 
  for (let i = 0; i < NUM_SEGMENTS; i++) {
    const segment = floorSegments[i];
    const oldZPos = segment.position.z;

    let z = -i * SEGMENT_LENGTH + scrollOffset;
    z = ((z - WRAP_THRESHOLD) % TOTAL_LENGTH);
    if (z > 0) z -= TOTAL_LENGTH;
    z += WRAP_THRESHOLD;

    segment.position.z = z;
  
    // detect if floor segment has wrapped around
    if (oldZPos > 0 && z < -SEGMENT_LENGTH) {
      generateObstacles(segment);
      generateCoins(segment);
    }
  }

  const activeSegments = floorSegments.filter(seg => Math.abs(seg.position.z) < SEGMENT_LENGTH);
  const nearbyObstacles = activeSegments.flatMap(seg => seg.userData.obstacles || []);
  const nearbyCoins = activeSegments
    .flatMap(seg => seg.userData.coins || [])
    .filter(coin => !coin.userData.collected);

  const allCoins = floorSegments.flatMap(seg => seg.userData.coins || []);
  for (let i = 0; i < allCoins.length; i++) {
    const coin = allCoins[i];
    if (coin.userData.collected) continue;
    coin.rotation.y += COIN_SPIN_SPEED * dt;
  }

  const collectedCoins = collisionSystem.getOverlappingTargets(scene, dino.model, nearbyCoins);
  for (let i = 0; i < collectedCoins.length; i++) {
    const coin = collectedCoins[i];
    if (coin.userData.collected) continue;
    coin.userData.collected = true;
    coin.visible = false;
    audioSystem.playCoin();
    gameState.addPoints(COIN_POINTS);
  }

  const collided = collisionSystem.checkPlayerVsObstacles(scene, dino.model, nearbyObstacles);
  if (collided) {
    audioSystem.playGameOver();
    gameState.setGameOver();
  }
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);


window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
