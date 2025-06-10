import * as THREE from 'three';
import { PLAYER_BB_OFFSET } from './index.js';

export function updatePlayerBoundingBox(camera, mesh, helper) {
    mesh.position.copy(camera.position);
    mesh.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(mesh);
    box.expandByScalar(PLAYER_BB_OFFSET);
    helper.box.copy(box);
}


export function isAABBIntersecting(shapes, playerMESH, camera) {
    const playerBox = new THREE.Box3().setFromObject(playerMESH);

    for (const box of shapes) {
        const objectBox = new THREE.Box3().setFromObject(box.mesh);

        if (
            playerBox.min.x <= objectBox.max.x && playerBox.max.x >= objectBox.min.x &&
            playerBox.min.y <= objectBox.max.y && playerBox.max.y >= objectBox.min.y &&
            playerBox.min.z <= objectBox.max.z && playerBox.max.z >= objectBox.min.z
        ) {

            const centerA = playerBox.getCenter(new THREE.Vector3());
            const centerB = objectBox.getCenter(new THREE.Vector3());

            const dx = centerB.x - centerA.x;
            const dy = centerB.y - centerA.y;
            const dz = centerB.z - centerA.z;

            const absDX = Math.abs(dx);
            const absDY = Math.abs(dy);
            const absDZ = Math.abs(dz);

            const sizeA = playerBox.getSize(new THREE.Vector3());
            const sizeB = objectBox.getSize(new THREE.Vector3());

            const overlapX = (sizeA.x + sizeB.x) / 2 - absDX;
            const overlapY = (sizeA.y + sizeB.y) / 2 - absDY;
            const overlapZ = (sizeA.z + sizeB.z) / 2 - absDZ;

            let objFace = "unknown";
            if (overlapX < overlapY && overlapX < overlapZ) {
                objFace = dx > 0 ? "left" : "right";
            } else if (overlapY < overlapZ) {
                objFace = dy > 0 ? "bottom" : "top";
            } else {
                objFace = dz > 0 ? "back" : "front";
            }

            const lookVector = new THREE.Vector3();
            camera.getWorldDirection(lookVector);

            const collisionVector = new THREE.Vector3(dx, dy, dz).normalize();

            const dot = lookVector.dot(collisionVector);

            let playerDirection = "unknown";
            const rightVector = new THREE.Vector3().crossVectors(lookVector, camera.up).normalize();
            const upVector = camera.up.clone().normalize();

            const dotRight = rightVector.dot(collisionVector);
            const dotUp = upVector.dot(collisionVector);


            if (Math.abs(dot) > Math.abs(dotRight) && Math.abs(dot) > Math.abs(dotUp)) {
                playerDirection = dot > 0 ? "front" : "back";
            } else if (Math.abs(dotRight) > Math.abs(dot) && Math.abs(dotRight) > Math.abs(dotUp)) {
                playerDirection = dotRight > 0 ? "right" : "left";
            } else {

                if (dy > 0 && Math.abs(dotUp) > Math.abs(dot)) {
                    playerDirection = "top";
                } else if (dy < 0 && Math.abs(dotUp) > Math.abs(dot)) {
                    playerDirection = "bottom";
                } else {
                    playerDirection = dotUp > 0 ? "top" : "bottom";
                }
            }

            let collisionNormal = new THREE.Vector3(dx, dy, dz);
            if (collisionNormal.lengthSq() > 0) {
                collisionNormal.normalize().negate();
            } else {
                collisionNormal.set(0, 1, 0);
            }

            return {
                isColliding: true,
                objFace,
                playerDirection,
                collisionNormal
            };
        }
    }

    return {
        isColliding: false,
        objFace: null,
        playerDirection: null,
        collisionNormal: new THREE.Vector3(0,0,0) 
    };
}
