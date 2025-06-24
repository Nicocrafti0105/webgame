import * as THREE from 'three';
import { wireframeEnabled } from './index.js';

export function performFrustumCulling(camera, scene, margin = 0.2) {
    const frustum = new THREE.Frustum();
    const cameraViewProjectionMatrix = new THREE.Matrix4();

    camera.updateMatrixWorld();
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

    scene.traverse((obj) => {
        if (obj.isMesh) {
            const geometry = obj.geometry;
            geometry.computeBoundingSphere();
            const sphere = geometry.boundingSphere.clone();
            sphere.applyMatrix4(obj.matrixWorld);

            sphere.radius *= (1 + margin);
            const isVisible = frustum.intersectsSphere(sphere);

            obj.visible = isVisible;
            if (wireframeEnabled && obj.userData.wire) obj.userData.wire.visible = isVisible;
        }
    });
}

export function performOcclusionCulling(camera, scene) {

}
