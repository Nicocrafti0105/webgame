import * as THREE from 'three';

const BB_OFFSET = 0.05


export function updateObjectVerticies(obj) {
    const tempGeo = obj.mesh.geometry.clone();
    tempGeo.applyMatrix4(obj.mesh.matrixWorld);

    const box = new THREE.Box3().setFromBufferAttribute(tempGeo.getAttribute('position'));
    box.expandByScalar(BB_OFFSET);

    obj.BB.box.copy(box);
}


function createShape(geometry = THREE.BoxGeometry, matColor, Pos, wireframeColor = '#ffffff') {
    const material = new THREE.MeshStandardMaterial({ color: matColor });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(Pos.x, Pos.y, Pos.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;


    const box3 = new THREE.Box3().setFromObject(mesh);
    box3.expandByScalar(BB_OFFSET);

    const collisionBox = new THREE.Box3Helper(box3, new THREE.Color('black'));
    collisionBox.visible = false;

    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: wireframeColor,
        wireframe: true
    });

    const wire = new THREE.Mesh(geometry, wireframeMaterial);
    wire.scale.multiplyScalar(1.001);
    wire.visible = false;

    mesh.add(wire);

    return { mesh, wire, material, collisionBox };
}



export class BoxShape {
    constructor(matColor = '#ffffff', Pos = { x: 0, y: 0, z: 0 }, wireframeColor = '#ffffff', h = 1, w = 1, d = w) {
        const geometry = new THREE.BoxGeometry(w, h, d);
        const { mesh, wire, material, collisionBox } = createShape(geometry, matColor, Pos, wireframeColor);
        this.mesh = mesh;
        this.wire = wire;
        this.material = material;
        this.BB = collisionBox;
    }
}

export class SphereShape {
    constructor(matColor = '#ffffff', Pos = { x: 0, y: 0, z: 0 }, wireframeColor = '#ffffff', radius = 1, detail = 5) {
        const geometry = new THREE.IcosahedronGeometry(radius, detail);
        const { mesh, wire, material, collisionBox } = createShape(geometry, matColor, Pos, wireframeColor);
        this.mesh = mesh;
        this.wire = wire;
        this.material = material;
        this.BB = collisionBox;
    }
}

export class ConeShape {
    constructor(matColor = '#ffffff', Pos = { x: 0, y: 0, z: 0 }, wireframeColor = '#ffffff', radius = 1, height = 2) {
        const geometry = new THREE.ConeGeometry(radius, height, 32);

        const { mesh, wire, material, collisionBox } = createShape(geometry, matColor, Pos, wireframeColor);
        this.mesh = mesh;
        this.wire = wire;
        this.material = material;
        this.BB = collisionBox;
    }
}
        
export class PlaneShape {
    constructor(matColor = '#ffffff', Pos = { x: 0, y: 0, z: 0 }, wireframeColor = '#ffffff', w = 1, h = 2) {
        const geometry = new THREE.PlaneGeometry(w, h);
        const { mesh, wire, material, collisionBox } = createShape(geometry, matColor, Pos, wireframeColor);
        mesh.rotation.x = -Math.PI / 2;
        this.mesh = mesh;
        this.wire = wire;
        this.material = material;
        this.BB = collisionBox;
    }
}
