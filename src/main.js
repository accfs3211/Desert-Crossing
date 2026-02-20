import * as THREE from 'three';
import { createWavyGroundGeometry, sampleTerrainHeight } from './geometries.js';

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

// lights 
const ambient = new THREE.AmbientLight(0x404060);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.95);
dir.position.set(0, 20, 10);
scene.add(dir);
const fill = new THREE.DirectionalLight(0xaaccff, 0.35);
fill.position.set(5, 8, -5);
scene.add(fill);

// placeholder dino 
const dinoMat = new THREE.MeshPhongMaterial({ color: 0x2d5a27, shininess: 30 });
const dinoBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.6, 0.5, 1),
  dinoMat
);
dinoBody.position.set(0, 0.25, 0);
dinoBody.castShadow = true;
scene.add(dinoBody);

const dinoHead = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.35, 0.5),
  dinoMat
);
dinoHead.position.set(0, 0.5, -0.5);
dinoHead.castShadow = true;
scene.add(dinoHead);
const dino = new THREE.Group();
dino.add(dinoBody);
dino.add(dinoHead);
scene.add(dino);

// moving world 
const SEGMENT_LENGTH = 24; // length  of one scrolling terrain segment in the z direction 
const GROUND_WIDTH = 500; // total terrain width across x
const PATH_WIDTH = 8; // width of the central playable path
const LANE_COUNT = 3; // left, center, right
const LANE_SPACING = PATH_WIDTH / LANE_COUNT; // x-distance between adjacent lanes
const LANE_MOVE_SPEED = 12; // lateral speed (units/sec) toward target lane
const LANE_SWITCH_COOLDOWN = 0.1; // delay between lane switch inputs (100 ms)
const NUM_SEGMENTS = 16; // number of terrain segments kept in rotation
const FLOOR_SPEED = 6; // how fast segments move toward the camera
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

  // yellow placeholder marker to show path is moving
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.08, 0.5),
    segmentMarkerMat
  );
  marker.position.set(0, 0.02, -SEGMENT_LENGTH / 2);
  seg.add(marker);

  seg.position.z = -i * SEGMENT_LENGTH;
  scene.add(seg);
  floorSegments.push(seg);
}

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

// jump physics
const GRAVITY = 30;            // base gravity when space released
const GRAVITY_HELD = 15;      // reduced gravity while holding space
const JUMP_VELOCITY = 10;     // initial upward kick on press
const MAX_JUMP_BOOST = 4;     // extra velocity added over hold duration
const BOOST_DURATION = 0.3;   // seconds of hold that still add boost, aka longer you press higher you jump 
const GROUND_Y = 0;

let dinoVelocityY = 0;
let dinoY = GROUND_Y;
let isOnGround = true;
let spaceHeld = false;
let holdTime = 0;
let currentLane = 1; // 0 left, 1 center, 2 right
let targetLane = 1;
let laneCooldownRemaining = 0;
let dinoVelocityX = 0;

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat && isOnGround) {
      dinoVelocityY = JUMP_VELOCITY;
      isOnGround = false;
      holdTime = 0;
    }
    spaceHeld = true;

  // allow jumping during side to side movement, but not allowing moving sideways while airborne 
  } else if (isOnGround && !e.repeat && (e.code === 'ArrowLeft' || e.code === 'KeyA')) {
    e.preventDefault();
    if (laneCooldownRemaining <= 0) {
      targetLane = Math.max(0, targetLane - 1);
      laneCooldownRemaining = LANE_SWITCH_COOLDOWN;
    }
  } else if (isOnGround && !e.repeat && (e.code === 'ArrowRight' || e.code === 'KeyD')) {
    e.preventDefault();
    if (laneCooldownRemaining <= 0) {
      targetLane = Math.min(LANE_COUNT - 1, targetLane + 1);
      laneCooldownRemaining = LANE_SWITCH_COOLDOWN;
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    spaceHeld = false;
  }
});

// animation
const clock = new THREE.Clock();
let scrollOffset = 0;
const TOTAL_LENGTH = NUM_SEGMENTS * SEGMENT_LENGTH;

function animate() {
  const dt = clock.getDelta();
  scrollOffset += FLOOR_SPEED * dt;
  laneCooldownRemaining = Math.max(0, laneCooldownRemaining - dt);

  
  if (!isOnGround) {
    // calculate vertical motion using velocity integration (v += a*dt, y += v*dt)
    if (spaceHeld && dinoVelocityY > 0 && holdTime < BOOST_DURATION) {
      holdTime += dt;
      // wile jump is held, add extra upward boost and use reduced gravity.
      dinoVelocityY += (MAX_JUMP_BOOST / BOOST_DURATION) * dt;
      dinoVelocityY -= GRAVITY_HELD * dt;
    } else {
      // normal airborne phase, only gravity affects vertical velocity.
      dinoVelocityY -= GRAVITY * dt;
    }

    dinoY += dinoVelocityY * dt;

    if (dinoY <= GROUND_Y) {
      dinoY = GROUND_Y;
      dinoVelocityY = 0;
      isOnGround = true;
    }
  }

  
  dino.position.y = dinoY;
  const targetX = (targetLane - 1) * LANE_SPACING;
  const dx = targetX - dino.position.x;
  if (Math.abs(dx) > 0.001) {
    const dir = Math.sign(dx);
    // Lateral velocity is fixed-speed toward target lane (sign decides direction).
    dinoVelocityX = dir * LANE_MOVE_SPEED;
    const step = dinoVelocityX * dt;
    // move by x velocity each frame, clamp if we overshoot the target lane.
    if (Math.abs(step) >= Math.abs(dx)) {
      dino.position.x = targetX;
      dinoVelocityX = 0;
      currentLane = targetLane;
    } else {
      dino.position.x += step;
    }
  } else {
    dinoVelocityX = 0;
  }

  // scroll floor segments 
  for (let i = 0; i < NUM_SEGMENTS; i++) {
    let z = -i * SEGMENT_LENGTH + scrollOffset;
    z = ((z - WRAP_THRESHOLD) % TOTAL_LENGTH);
    if (z > 0) z -= TOTAL_LENGTH;
    z += WRAP_THRESHOLD;

    floorSegments[i].position.z = z;
  }

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);



window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
