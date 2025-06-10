import * as THREE from 'three';
import NoiseModule from 'noisejs';
import { GUI } from 'dat.gui';
import Stats from 'three/addons/libs/stats.module.js';

////////////////////////////// BASE ////////////////////////////////

function dtr(degrees) {
    return degrees * (Math.PI / 180);
}

const Noise = NoiseModule.Noise;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8c8dff);
const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);


const ambientLight = new THREE.AmbientLight(0xffffff,2.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.6);
dirLight.position.set(50, 150, 50);
scene.add(dirLight);
dirLight.castShadow = true
dirLight.shadow.mapSize.width = 128;
dirLight.shadow.mapSize.height = 128;

dirLight.target.position.set(0, 0, 0);
scene.add(dirLight.target);

    
let data = {
    chunkSize: 8,
    renderDistance: 8,
    baseY : 0,
    LodFactor: 4,
};


////////////////////////////// GENERATION ////////////////////////////////


function generateChunk(pos = new THREE.Vector2(0, 0), Size) {
    const worldX = pos.x * Size;
    const worldZ = pos.y * Size;

    const Vertices = [
        new THREE.Vector3(0, data.baseY, 0),
        new THREE.Vector3(Size, data.baseY, 0),
        new THREE.Vector3(Size, data.baseY, Size),
        new THREE.Vector3(0, data.baseY, Size),
    ];

    const meshGeometry = new THREE.BufferGeometry().setFromPoints(Vertices);
    const meshMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.LineLoop(meshGeometry, meshMaterial);


    mesh.position.set(worldX, 0, worldZ);

    mesh.name = 'chunk';
    scene.add(mesh);
    map.set(`${pos.x}_${pos.y}`, mesh);
    return mesh;
}


function getPosByChunk(chunk = new THREE.Mesh()) {
    const y = chunk.position.z / data.chunkSize
    const x = chunk.position.x / data.chunkSize
    return new THREE.Vector2(x,y)
}

function getChunkByPos(WorldPos = new THREE.Vector3()) {
    const y = WorldPos.z / data.chunkSize
    const x = WorldPos.x / data.chunkSize
    return map.get(`${x}_${y}`)
}


function getAdjacentChunks(chunk = new THREE.Mesh()) {
    const adjacents = []
    const pos = getPosByChunk(chunk)
    
    for (let x = pos.x - 1; x <= pos.x + 1; x++) {
        for (let y = pos.y - 1; y <= pos.y + 1; y++) {
            adjacents.push(map.get(`${x}_${y}`))
        }
    }

    return adjacents
}


function updateChunkLOD(chunk) {
    const cameraDistance = camera.position.distanceTo(chunk.position);
    let lod = 1;

    if (cameraDistance > data.chunkSize * data.LodFactor) {
        lod = 2;
    }
    if (cameraDistance > data.chunkSize * data.LodFactor * 2.5) {
        lod = 3;
    }
    if (cameraDistance > data.chunkSize * data.LodFactor * 4) {
        lod = 4;
    }
    if (cameraDistance > data.chunkSize * data.LodFactor * 5.5) {
        lod = 5;
    }

    switch (lod) {
        case 1:
            chunk.material.color.set(0xff0000);
            break;
        case 2:
            chunk.material.color.set(0x00ff00);
            break;
        case 3:
            chunk.material.color.set(0x0000ff);
            break;
        case 4:
            chunk.material.color.set(0xff00ff);
            break;
        case 5:
            chunk.material.color.set(0xffff00);
            break;
        default:
            chunk.material.color.set(0xffffff);
            break;
    }
}

////////////////////////////// INIT ////////////////////////////////
let map = new Map()

function init() {
    map.forEach((mesh) => {
        mesh.geometry.dispose();
        scene.remove(mesh);
    });
    map.clear();
    for (let x = -data.renderDistance; x <= data.renderDistance; x++) {
        for (let y = -data.renderDistance; y <= data.renderDistance; y++) {
            const chunk = generateChunk(new THREE.Vector2(x, y), data.chunkSize);
            updateChunkLOD(chunk);
        }
    }

    map.forEach(chunk => {
        updateChunkLOD(chunk)
    })

}

////////////////////////////// GUI ////////////////////////////////

const gui = new GUI();

const ChunkFolder = gui.addFolder("Chunks");
ChunkFolder.add(data, "renderDistance", 1, 64,1).onChange(init)
ChunkFolder.add(data, "chunkSize", 1,32,1).onChange(init)
ChunkFolder.add(data, "LodFactor", 1,16,0.5).onChange(init)
ChunkFolder.open();

init()

////////////////////////////// LOOP ////////////////////////////////
let CameraPos = new THREE.Vector3(0,0,0)
let speedCam = 0.4
const keysPressed=[]

function animate() {
    requestAnimationFrame(animate);

    if (keysPressed['z']) CameraPos.z -= speedCam;
    if (keysPressed['s']) CameraPos.z += speedCam;
    if (keysPressed['q']) CameraPos.x -= speedCam;
    if (keysPressed['d']) CameraPos.x += speedCam;

    camera.position.copy(CameraPos)
    camera.position.setY(40)
    camera.lookAt(new THREE.Vector3(camera.position.x, data.baseY, camera.position.z))

    map.forEach(chunk => {
        updateChunkLOD(chunk)
    })

    renderer.render(scene,camera)
    stats.update();
}

animate();

////////////////////////////// LISTENERS ////////////////////////////////


window.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'y') {
        window.location.href = './Chunk.html'
    }
    if (e.key.toLowerCase() === 't') {
        window.location.href = './Terrain.html'
    }
    if (e.key.toLowerCase() === 'u') {
        window.location.href = './index.html'
    }
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


window.addEventListener('wheel', (e) => {
    e.preventDefault();
    data.baseY += e.deltaY * -0.02;
    
    init();
}, { passive: false });


