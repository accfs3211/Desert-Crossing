import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const GRAVITY = 30;
const GRAVITY_HELD = 15;
const JUMP_VELOCITY = 10;
const MAX_JUMP_BOOST = 4;
const BOOST_DURATION = 0.3;
const GROUND_Y = 0;

export class Dino {
    constructor() {
        this.model = null;
        this.offsetY = 0;

        this.y = GROUND_Y;
        this.velocityY = 0;
        this.isOnGround = true;
        this.spaceHeld = false;
        this.holdTime = 0;

        this.keydown = this.keydown.bind(this);
        this.keyup = this.keyup.bind(this);
        window.addEventListener('keydown', this.keydown);
        window.addEventListener('keyup', this.keyup);
    }

    load(scene, callback) {
        const objLoader = new OBJLoader();
        objLoader.load('assets/dino.obj', (model) => {
            this.model = model;
            this.model.scale.set(0.3, 0.3, 0.3);
            this.model.rotation.y = Math.PI / 2;

            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material.color.set(0x9c432a);
                    child.material.needsUpdate = true;
                }
            });

            const dinoBounds = new THREE.Box3().setFromObject(this.model);
            this.offsetY = (dinoBounds.max.y - dinoBounds.min.y) / 2;
            this.model.position.y = this.y + this.offsetY;

            scene.add(this.model);
            if (callback) callback();
        });
    }

    update(dt) {
        if (!this.model) return;

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
            }
        }

        this.model.position.y = this.y + this.offsetY;
    }

    keydown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            if (!e.repeat && this.isOnGround) {
                this.velocityY = JUMP_VELOCITY;
                this.isOnGround = false;
                this.holdTime = 0;
            }
            this.spaceHeld = true;
        }  
    }

    keyup(e) {
        if (e.code === 'Space'){
            e.preventDefault();
            this.spaceHeld = false;
        }
    }
}