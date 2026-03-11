import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// constants for jumping 
const GRAVITY = 30;
const GRAVITY_HELD = 15;
const JUMP_VELOCITY = 10;
const MAX_JUMP_BOOST = 4;
const BOOST_DURATION = 0.3;
const GROUND_Y = 0;

// constants for lane swapping 
const DEFAULT_LANE_COUNT = 3;
const DEFAULT_LANE_SPACING = 8 / 3;
const DEFAULT_LANE_MOVE_SPEED = 12;
const DEFAULT_LANE_SWITCH_COOLDOWN = 0.1;

// spawning location constant 
const DEFAULT_SPAWN_Y = GROUND_Y;

// constants for ducking 
const DUCK_DURATION = 0.3;
const DUCK_COOLDOWN = 0.35;
const DUCK_Y_SCALE_MULTIPLIER = 0.5;
const DUCK_SPRING_STIFFNESS = 45;
const DUCK_SPRING_DAMPING = 12;

export class Dino {
    constructor(options = {}) {
        this.model = null;
        this.offsetY = 0;
        this.onJump = options.onJump;

        // variables for jumping 
        this.y = options.spawnY ?? DEFAULT_SPAWN_Y;
        this.velocityY = 0;
        this.isOnGround = this.y <= GROUND_Y;
        this.spaceHeld = false;
        this.holdTime = 0;
        this.velocityX = 0;

        // variables for ducking 
        this.baseScale = new THREE.Vector3(1, 1, 1);
        this.isDucking = false;
        this.duckTimer = 0;
        this.duckCooldownRemaining = 0;
        this.duckScaleRatio = 1;
        this.duckScaleVelocity = 0;

        // variables for walking
        this.walkFrames = [];
        this.currentFrame = 0;
        this.walkTimer = 0;
        this.walkFrameDuration = 0.12;

        // Lane movement config/state
        this.laneCount = options.laneCount ?? DEFAULT_LANE_COUNT;
        this.laneSpacing = options.laneSpacing ?? DEFAULT_LANE_SPACING;
        this.laneMoveSpeed = options.laneMoveSpeed ?? DEFAULT_LANE_MOVE_SPEED;
        this.laneSwitchCooldown = options.laneSwitchCooldown ?? DEFAULT_LANE_SWITCH_COOLDOWN; // total time between lane switches 
        this.laneCooldownRemaining = 0; // time remaining before another lane switch 
        this.currentLane = 1; // 0 left, 1 center, 2 right
        this.targetLane = 1;
        
        this.airMoveUsed = false; // currently, dino can only move once in mid air so it doesn't look like it's just flying 

        this.keydown = this.keydown.bind(this);
        this.keyup = this.keyup.bind(this);
        window.addEventListener('keydown', this.keydown);
        window.addEventListener('keyup', this.keyup);
    }

    load(scene, callback) {
        const objLoader = new OBJLoader();
    
        const files = ['assets/dino.obj', 'assets/dino2.obj'];
    
        Promise.all(files.map(file => {
            return new Promise(resolve => {
                objLoader.load(file, (model) => {
    
                    model.scale.set(0.55, 0.55, 0.55);
                    //model.position.set(x, 1, z);
                    model.rotation.y = Math.PI / 2;
    
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            child.material.color.set(0x9c432a);
                            child.material.needsUpdate = true;
                        }
                    });
    
                    resolve(model);
                });
            });
        })).then(models => {
    
            this.model = new THREE.Group();
    
            models.forEach((m, i) => {

                const box = new THREE.Box3().setFromObject(m);

                // shift mesh so bottom touches y = 0
                m.position.y -= box.min.y;
                m.visible = (i === 0);
                this.walkFrames.push(m);
                this.model.add(m);
            });
    
            this.baseScale.copy(this.walkFrames[0].scale);
    
            const bounds = new THREE.Box3().setFromObject(this.walkFrames[0]);
            this.offsetY = -bounds.min.y;
            this.model.position.y = this.y + this.offsetY;
    
            scene.add(this.model);
    
            if (callback) callback();
        });
    }

    update(dt) {
        if (!this.model) return;

        if (this.isOnGround) {
            this.walkTimer += dt;

            if (this.walkTimer > this.walkFrameDuration) {
                this.walkTimer = 0;

                this.walkFrames[this.currentFrame].visible = false;

                this.currentFrame = (this.currentFrame + 1) % this.walkFrames.length;

                this.walkFrames[this.currentFrame].visible = true;
            }
        }
        
        this.laneCooldownRemaining = Math.max(0, this.laneCooldownRemaining - dt);
        this.duckCooldownRemaining = Math.max(0, this.duckCooldownRemaining - dt);

        if (this.isDucking) {
            this.duckTimer -= dt;
            if (this.duckTimer <= 0) {
                this.endDuck();
            }
        }

        this.updateDuckScale(dt);

        if (!this.isOnGround) {
            if (this.spaceHeld && this.velocityY > 0 && this.holdTime < BOOST_DURATION) {
                this.holdTime += dt;
                this.velocityY += (MAX_JUMP_BOOST / BOOST_DURATION) * dt;
                this.velocityY -= GRAVITY_HELD * dt;
            } else {
                this.velocityY -= GRAVITY * dt;
            }

            this.y += this.velocityY * dt;

            if (this.y <= GROUND_Y) {
                this.y = GROUND_Y;
                this.velocityY = 0;
                this.isOnGround = true;
                this.airMoveUsed = false;
            }
        }

        const scaledOffsetY = this.offsetY * this.duckScaleRatio;
        this.model.position.y = this.y + scaledOffsetY;

        // Keep lateral movement active even when airborne if it started on ground.
        const targetX = (this.targetLane - 1) * this.laneSpacing;
        const dx = targetX - this.model.position.x;
        if (Math.abs(dx) > 0.001) {
            const dir = Math.sign(dx);
            this.velocityX = dir * this.laneMoveSpeed;
            const step = this.velocityX * dt;
            if (Math.abs(step) >= Math.abs(dx)) {
                this.model.position.x = targetX;
                this.velocityX = 0;
                this.currentLane = this.targetLane;
            } else {
                this.model.position.x += step;
            }
        } else {
            this.velocityX = 0;
            this.currentLane = this.targetLane;
        }
    }

    startDuck() {
        if (!this.model || this.isDucking || this.duckCooldownRemaining > 0 || !this.isOnGround) return;

        this.isDucking = true;
        this.duckTimer = DUCK_DURATION;
        this.duckCooldownRemaining = DUCK_COOLDOWN;
    }

    endDuck() {
        if (!this.model || !this.isDucking) return;
        this.isDucking = false;
        this.duckTimer = 0;
    }

    updateDuckScale(dt) {
        if (!this.model) return;

        const targetRatio = this.isDucking ? DUCK_Y_SCALE_MULTIPLIER : 1;
        const displacement = targetRatio - this.duckScaleRatio;
        const accel = (displacement * DUCK_SPRING_STIFFNESS) - (this.duckScaleVelocity * DUCK_SPRING_DAMPING);
        this.duckScaleVelocity += accel * dt;
        this.duckScaleRatio += this.duckScaleVelocity * dt;

        if (Math.abs(displacement) < 0.0005 && Math.abs(this.duckScaleVelocity) < 0.0005) {
            this.duckScaleRatio = targetRatio;
            this.duckScaleVelocity = 0;
        }

        this.model.scale.set(
            this.baseScale.x,
            this.baseScale.y * this.duckScaleRatio,
            this.baseScale.z
        );
    }

    keydown(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            e.preventDefault();
            if (this.isDucking) return;
            if (!e.repeat && this.isOnGround) {
                this.velocityY = JUMP_VELOCITY;
                this.isOnGround = false;
                this.holdTime = 0;
                this.airMoveUsed = false;
                if (this.onJump) this.onJump();
            }
            this.spaceHeld = true;
        } else if (!e.repeat && (e.code === 'ArrowDown' || e.code === 'KeyS')) {
            e.preventDefault();
            this.startDuck();
        } else if (!e.repeat && (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD')) {
            e.preventDefault();
            if (this.isDucking) return;
            if (this.laneCooldownRemaining > 0) return;

            const direction = (e.code === 'ArrowLeft' || e.code === 'KeyA') ? -1 : 1;
            const nextLane = Math.max(0, Math.min(this.laneCount - 1, this.targetLane + direction));

            // ignore out of bounds attempts so they do not consume the in-air move.
            if (nextLane === this.targetLane) return;

            if (!this.isOnGround && this.airMoveUsed) return;

            this.targetLane = nextLane;
            this.laneCooldownRemaining = this.laneSwitchCooldown;

            if (!this.isOnGround) {
                this.airMoveUsed = true;
            }
        }
    }

    keyup(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW'){
            e.preventDefault();
            this.spaceHeld = false;
        }
    }
}
