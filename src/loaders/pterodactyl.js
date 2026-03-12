import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const MIN_PAUSE = 7;
const MAX_PAUSE = 20;
const LEFT_BOUND = -55;
const RIGHT_BOUND = 20;

export class Pterodactyl {
    constructor(options = {}) {
        this.model = null;

        // animation variables
        this.frames = [];
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameDuration = 0.2; 

        // flying variables
        this.speed = 6; 
        this.direction = 1;
        this.pauseTimer = 0;
        this.isFlying = true;

        this.bounds = new THREE.Box3();
        this.hitboxShrink = new THREE.Vector3(0.1, 0.1, 0.1); 

        this.initialState = {
            direction: Math.random() > 0.5 ? 1 : -1,
            isFlying: false,
            pauseTimer: MIN_PAUSE + Math.random() * (MAX_PAUSE - MIN_PAUSE),
            positionX: LEFT_BOUND,
            positionY: 3
        };
    }

    load(callback) {
        const loader = new OBJLoader();
        const files = ['assets/pterodactyl1.obj', 'assets/pterodactyl2.obj'];

        Promise.all(files.map(file => {
            return new Promise(resolve => {
                loader.load(file, model => {
                    model.scale.set(0.12, 0.12, 0.12);
                    model.rotation.y = this.direction === 1 ? -Math.PI / 2 : Math.PI / 2;

                    model.traverse(child => {
                        if (child.isMesh) {
                            child.material = new THREE.MeshPhongMaterial({ color: 0x3c4066, shininess: 20 });
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    resolve(model);
                }); 
            });
        })).then(models => {
            this.model = new THREE.Group();

            models.forEach((m, i) => {
                m.visible = i === 0;
                this.frames.push(m);
                this.model.add(m);
            });

            // set initial position 
            this.model.position.x = this.initialState.positionX;
            this.model.position.y = this.initialState.positionY;

            // set initial states
            this.isFlying = this.initialState.isFlying;
            this.pauseTimer = this.initialState.pauseTimer;
            this.direction = this.initialState.direction;
            this.prevDirection = this.direction;

            if (callback) callback(this);
        });
    }

    update(dt) {
        if (!this.model) return;
        
        // pause timer if flying
        if (!this.isFlying) {
            this.pauseTimer -= dt;
    
            if (this.pauseTimer <= 0) {
                this.startFlight();
            }
    
            return;
        }
    
        this.model.position.x += this.direction * this.speed * dt;
    
        // exit screen, pause flying
        if (this.model.position.x > RIGHT_BOUND || this.model.position.x < LEFT_BOUND) {
            this.startPause();
        }
    
        // flying animation
        this.frameTimer += dt;
        if (this.frameTimer >= this.frameDuration) {
            this.frameTimer = 0;
    
            this.frames[this.currentFrame].visible = false;
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
            this.frames[this.currentFrame].visible = true;
        }
    }

    startPause() {
        this.isFlying = false;
    
        // random pause, 10-20 seconds
        this.pauseTimer = MIN_PAUSE + Math.random() * (MAX_PAUSE - MIN_PAUSE);
    
        // move offscreen 
        this.model.position.x = this.direction > 0 ? RIGHT_BOUND + 2 : LEFT_BOUND - 2;
    }

    startFlight() {
        this.isFlying = true;
    
        // random direction
        this.direction = Math.random() > 0.5 ? 1 : -1;
    
        this.model.position.x = this.direction === 1 ? LEFT_BOUND : RIGHT_BOUND;
        this.model.rotation.y = this.direction === 1 ? 0 : Math.PI;
    }

    reset() {
        this.isFlying = this.initialState.isFlying;
        this.pauseTimer = MIN_PAUSE + Math.random() * (MAX_PAUSE - MIN_PAUSE);
        this.direction = Math.random() > 0.5 ? 1 : -1,
        this.prevDirection = this.direction;
        this.model.position.x = LEFT_BOUND;
        this.model.position.y = this.initialState.positionY;
    }
}