import * as THREE from 'three';
import { shapes , wireframeEnabled } from './index.js';

export function performFrustumCulling(camera) {
    const frustum = new THREE.Frustum();
    const cameraViewProjectionMatrix = new THREE.Matrix4();

    camera.updateMatrixWorld();
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

    for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        const mesh = shape.mesh;

        const boundingBox = new THREE.Box3().setFromObject(mesh);
        const isVisible = frustum.intersectsBox(boundingBox);

        mesh.visible = isVisible;
        if (wireframeEnabled) shape.wire.visible = isVisible;

    }
}
// here the quadtree funct