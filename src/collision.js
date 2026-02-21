import * as THREE from 'three';

function intersectsWithShrink(a, b, shrinkA, shrinkB) {
  // shrink each side of the box (to make hits feel less unfair than raw mesh bounds)
  return (
    a.min.x + shrinkA.x <= b.max.x - shrinkB.x &&
    a.max.x - shrinkA.x >= b.min.x + shrinkB.x &&
    a.min.y + shrinkA.y <= b.max.y - shrinkB.y &&
    a.max.y - shrinkA.y >= b.min.y + shrinkB.y &&
    a.min.z + shrinkA.z <= b.max.z - shrinkB.z &&
    a.max.z - shrinkA.z >= b.min.z + shrinkB.z
  );
}

export function createCollisionSystem(options = {}) {
  const playerShrink = options.playerShrink ?? new THREE.Vector3(0.2, 0.15, 0.2);
  const zeroShrink = new THREE.Vector3(0, 0, 0);
  const playerHitbox = new THREE.Box3();
  const obstacleHitbox = new THREE.Box3();

  function checkPlayerVsObstacles(scene, playerModel, obstacles) {
    if (!playerModel) return false;

    // uses world-space bounds, so parent transforms (scrolling segments) are included
    scene.updateMatrixWorld(true);
    playerHitbox.setFromObject(playerModel);

    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      obstacleHitbox.setFromObject(obstacle);
      const obstacleShrink = obstacle.userData.hitboxShrink || zeroShrink;
      if (intersectsWithShrink(playerHitbox, obstacleHitbox, playerShrink, obstacleShrink)) {
        return true;
      }
    }

    return false;
  }

  return {
    checkPlayerVsObstacles
  };
}
