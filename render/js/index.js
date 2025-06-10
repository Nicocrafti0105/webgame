// index.js
import * as THREE from 'three';
import { EffectComposer } from 'jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'jsm/shaders/FXAAShader.js';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'dat.gui';

import { BoxShape, SphereShape, ConeShape, updateObjectVerticies } from './shapes.js';
import { performFrustumCulling } from './Opti.js';

import { generateChunk, updateChunkLOD } from './generation.js';

/////////////////// GLOBALS VARS \\\\\\\\\\\\\\\\\\\

const w = window.innerWidth;
const h = window.innerHeight;

const FOV = 75;
const ASPECT = w / h;
const NEAR = 0.1;
const FAR = 20000;
const ROTATION_SPEED = 0.002;

let PLAYER_VEL = new THREE.Vector3();
const ACCELERATION = 50;
const FRICTION = 5;
let PLAYER_SPEED = 2;

const PLAYER_HEIGHT = 1.5;
const PLAYER_SIZE = 1;
export const PLAYER_BB_OFFSET = 0.05;

/////////////////// HTML \\\\\\\\\\\\\\\\\\\

const displayText = document.querySelector('#displayText');

/////////////////// SETUP \\\\\\\\\\\\\\\\\\\

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x858792);

const camera = new THREE.PerspectiveCamera(FOV, ASPECT, NEAR, FAR);
camera.position.set(0, 40, -10);
camera.rotation.set(0, 0, 0);

const PlayerGEO = new THREE.BoxGeometry(PLAYER_SIZE, PLAYER_HEIGHT, PLAYER_SIZE);
const PlayerMAT = new THREE.MeshStandardMaterial();
const PlayerMESH = new THREE.Mesh(PlayerGEO, PlayerMAT);

const PlayerBox = new THREE.Box3().setFromObject(PlayerMESH);
PlayerBox.expandByScalar(PLAYER_BB_OFFSET);
PlayerBox.visible = false;

const PlayerBB = new THREE.Box3Helper(PlayerBox, new THREE.Color('red'));
PlayerBB.visible = false;

scene.add(PlayerMESH);
scene.add(PlayerBB);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);

document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

stats.dom.style.transform = 'scale(1.2)';
stats.dom.style.transformOrigin = 'top left';

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.material.uniforms['resolution'].value.set(
    1 / window.innerWidth,
    1 / window.innerHeight
);
composer.addPass(fxaaPass);

renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;

/////////////////// LIGHTS \\\\\\\\\\\\\\\\\\\

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(80, 20, 10);
directionalLight.lookAt(new THREE.Vector3(0, 0, 0));
directionalLight.castShadow = true;
scene.add(directionalLight);

/////////////////// SHAPES \\\\\\\\\\\\\\\\\\\

class Torch {
    constructor(pos, color) {
        this.pos = pos;
        this.pos.setY(this.pos.y - 1.5);
        this.object = new THREE.Group();
        this.object.position.copy(pos);

        const flameGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const flameMaterial = new THREE.MeshBasicMaterial({ color: color });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.y = 2.05;
        this.object.add(flame);

        const light = new THREE.PointLight(color, 8, 60, 0.2);
        light.position.y = 2.1;
        this.object.add(light);
        scene.add(this.object);
    }
}

export const shapes = [];


async function GetShader(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load shader');
    return await response.text();
}

let TerrainVertexShader = NaN;
let TerrainFragmentShader = NaN;

async function GetRessources() {
    TerrainVertexShader = await GetShader('./js/Shader/terrain.vert');
    TerrainFragmentShader = await GetShader('./js/Shader/terrain.frag');

    const GroundMat = new THREE.ShaderMaterial({
        vertexShader: TerrainVertexShader,
        fragmentShader: TerrainFragmentShader,
        uniforms: {
            minHeight: { value: -50 },
            maxHeight: { value: 150 },
        },
        side: THREE.DoubleSide,
        wireframe: false,
    });
    return GroundMat;
}


// --- Chunk Manager ---
class ChunkManager {
    constructor(scene, camera, vars) {
        this.scene = scene;
        this.camera = camera;
        this.vars = vars;
        this.activeChunks = new Map();
        this.playerChunkCoords = new THREE.Vector2();
        this.lastPlayerChunkCoords = new THREE.Vector2(-Infinity, -Infinity);
    }

    getChunkCoords(worldX, worldZ) {
        const chunkX = Math.floor(worldX / this.vars.chunkSize);
        const chunkZ = Math.floor(worldZ / this.vars.chunkSize);
        return new THREE.Vector2(chunkX, chunkZ);
    }


    getOrCreateChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX * this.vars.chunkSize}_${chunkZ * this.vars.chunkSize}`;
        if (this.activeChunks.has(chunkKey)) {
            return this.activeChunks.get(chunkKey);
        } else {
            const chunk = generateChunk(new THREE.Vector2(chunkX, chunkZ), this.vars.chunkSize);
            this.scene.add(chunk);
            this.activeChunks.set(chunkKey, chunk);
            return chunk;
        }
    }


    update(cameraPosition) {
        const currentChunkX = Math.floor(cameraPosition.x / this.vars.chunkSize);
        const currentChunkZ = Math.floor(cameraPosition.z / this.vars.chunkSize);

        if (currentChunkX === this.lastPlayerChunkCoords.x && currentChunkZ === this.lastPlayerChunkCoords.y) {
            return;
        }

        this.lastPlayerChunkCoords.set(currentChunkX, currentChunkZ);

        const newActiveChunks = new Map();
        const renderDistance = this.vars.renderDistance;


        for (let x = currentChunkX - renderDistance; x <= currentChunkX + renderDistance; x++) {
            for (let z = currentChunkZ - renderDistance; z <= currentChunkZ + renderDistance; z++) {
                const chunkKey = `${x * this.vars.chunkSize}_${z * this.vars.chunkSize}`;
                const chunk = this.getOrCreateChunk(x, z);
                newActiveChunks.set(chunkKey, chunk);
            }
        }


        this.activeChunks.forEach((chunk, key) => {
            if (!newActiveChunks.has(key)) {
                this.scene.remove(chunk);
                chunk.geometry.dispose();
                chunk.material.dispose();
                this.activeChunks.delete(key);
            }
        });

        this.activeChunks = newActiveChunks;
    }

    updateAllLODs() {
        this.activeChunks.forEach((chunk) => {
            updateChunkLOD(chunk, this.camera);
        });
    }


    disposeAllChunks() {
        this.activeChunks.forEach((chunk) => {
            this.scene.remove(chunk);
            chunk.geometry.dispose();
            chunk.material.dispose();
        });
        this.activeChunks.clear();
    }
}


let chunkManager;

function init() {
    if (chunkManager) {
        chunkManager.disposeAllChunks();
    }
    chunkManager = new ChunkManager(scene, camera, vars);
    chunkManager.update(camera.position);
    chunkManager.updateAllLODs();
}


shapes.forEach((shape) => {
    scene.add(shape.mesh);
    scene.add(shape.BB);
});

/////////////////// GUI \\\\\\\\\\\\\\\\\\\

const gui = new GUI({ name: 'Config' });
const devFolder = gui.addFolder('Dev');
const envFolder = gui.addFolder('Environement');
export const vars = {
    background: 0x3e4063,
    light: 1.5,
    wireColor: 0xe84a4a,
    wireframeEnabled: false,
    chunkSize: 8,
    renderDistance: 16, // Number of chunks from player center
    LodFactor: 4,
    terrainDepth: 16, // These might become obsolete with dynamic chunking
    terrainWidth: 16, // These might become obsolete with dynamic chunking
    baseY: 0,
};

envFolder.addColor(vars, 'background').onChange((e) => {
    scene.background = new THREE.Color(vars.background);
});
envFolder.add(vars, 'light', 0, 20, 0.5).onChange((e) => {
    directionalLight.intensity = vars.light;
    ambientLight.intensity = vars.light * 0.5;
});

const ChunkFolder = gui.addFolder('Chunks');
ChunkFolder.add(vars, 'renderDistance', 1, 64, 1).onChange(init); // Re-init on change
ChunkFolder.add(vars, 'chunkSize', 1, 32, 1).onChange(init); // Re-init on change
ChunkFolder.add(vars, 'LodFactor', 1, 16, 0.5); // No need to re-init, just update LODs

// Initial setup of chunks
init();

/////////////////// WIREFRAME (ALT + W) AND HitBoxes (Alt + C) \\\\\\\\\\\\\\\\\\\

export let wireframeEnabled = false;
let HitBoxesEnabled = false;

window.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'r') {
        camera.position.set(0, 20, 0);
        camera.rotation.set(0, 0, 0);
        PLAYER_VEL.set(0, 2, 0);
        yaw = 0;
        pitch = 0;
        // Also update chunk manager when resetting camera position
        chunkManager.update(camera.position);
        chunkManager.updateAllLODs();
    }
    if (e.altKey && e.key.toLowerCase() === 'c') {
        HitBoxesEnabled = !HitBoxesEnabled;
        shapes.forEach((shape) => {
            shape.BB.visible = HitBoxesEnabled;
        });
        PlayerBB.visible = HitBoxesEnabled;
    }
});

/////////////////// RESIZE \\\\\\\\\\\\\\\\\\\

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
});

/////////////////// KEYBOARD STATE \\\\\\\\\\\\\\\\\\\

const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    onKeyPress(e.key.toLowerCase(), e);
    if (e.ctrlKey) {
        PLAYER_SPEED = 6;
    } else {
        PLAYER_SPEED = 2;
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    onKeyRelease(e.key.toLowerCase(), e);
});

/////////////////// MOUSE STATE \\\\\\\\\\\\\\\\\\\

renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
    const isLocked = document.pointerLockElement === renderer.domElement;
    if (isLocked) {
        document.addEventListener('mousemove', onMouseMove, false);
    } else {
        document.removeEventListener('mousemove', onMouseMove, false);
    }
});

let yaw = 0;
let pitch = 0;

const MIN_PITCH = -Math.PI / 2;
const MAX_PITCH = Math.PI / 2;

function onMouseMove(e) {
    const deltaX = -e.movementX * ROTATION_SPEED;
    const deltaY = -e.movementY * ROTATION_SPEED;

    yaw += deltaX;
    pitch += deltaY;

    pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch));

    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const pitchQuaternion = new THREE.Quaternion();
    pitchQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    quaternion.multiply(pitchQuaternion);

    camera.quaternion.copy(quaternion);
}

/////////////////// KEYS \\\\\\\\\\\\\\\\\\\

function onKeyPress(key) {
    switch (key) {
        case 'arrowup':
            // TimeCycle += 0.5; // Make sure TimeCycle is defined if used
            break;
        case 'arrowdown':
            // TimeCycle -= 0.5; // Make sure TimeCycle is defined if used
            break;
        case 't':
            window.location.href = './Terrain.html';
            break;
        case 'y':
            window.location.href = './Chunk.html';
            break;
    }
}

function onKeyRelease(key) {
    switch (key) {
        case 'g':
            const torchwhite = new Torch(camera.position, 0xf8f1e2);
            break;
        case 'h':
            const torchred = new Torch(camera.position, 0xf58787);
            break;
        case 'j':
            const torchblue = new Torch(camera.position, 0x8ed9e7);
            break;
        case 'k':
            const torchyellow = new Torch(camera.position, 0xe6f54c);
            break;
        case 'l':
            const torchpurple = new Torch(camera.position, 0xdc85f0);
            break;
    }
}

function KeyMovement(accelDirection) {
    if (keys['d']) accelDirection.x += 1;
    if (keys['q']) accelDirection.x -= 1;
    if (keys['z']) accelDirection.z -= 1;
    if (keys['s']) accelDirection.z += 1;
    if (keys['shift']) accelDirection.y = -1;
    if (keys[' ']) accelDirection.y = 1;
}

////////////////////////// MINIMAP //////////////////////////////

let lastCameraPosition = new THREE.Vector3();
let minimapFrameCounter = 0;
const MINIMAP_UPDATE_INTERVAL = 5; // Update minimap every 5 frames

function renderMinimapIfChanged() {
    minimapFrameCounter++;
    if (minimapFrameCounter % MINIMAP_UPDATE_INTERVAL !== 0) {
        return; // Skip rendering if not on the update interval
    }

    if (!camera.position.equals(lastCameraPosition)) {
        minimapCamera.position.set(camera.position.x, 1250, camera.position.z);
        minimapCamera.lookAt(camera.position.x, 0, camera.position.z);
        minimapRenderer.render(scene, minimapCamera);
        lastCameraPosition.copy(camera.position);
    }
}

const minimapSize = 400;
const minimapRenderer = new THREE.WebGLRenderer({ antialias: true });
minimapRenderer.setSize(minimapSize, minimapSize);
minimapRenderer.domElement.style.position = 'absolute';
minimapRenderer.domElement.style.bottom = '10px';
minimapRenderer.domElement.style.left = '10px';
minimapRenderer.domElement.style.border = '2px solid #222';
minimapRenderer.domElement.style.zIndex = '10';
document.body.appendChild(minimapRenderer.domElement);

const minimapCamera = new THREE.OrthographicCamera(
    -vars.renderDistance * vars.chunkSize,
    vars.renderDistance * vars.chunkSize,
    vars.renderDistance * vars.chunkSize,
    -vars.renderDistance * vars.chunkSize,
    0.1,
    2000
);

minimapCamera.up.set(0, 0, -1);
minimapCamera.lookAt(new THREE.Vector3(0, -1, 0));

let minimapControlsEnabled = false;
minimapRenderer.domElement.addEventListener('pointerdown', (e) => {
    minimapControlsEnabled = true;
});
window.addEventListener('pointerup', () => {
    minimapControlsEnabled = false;
});

minimapRenderer.domElement.addEventListener('pointermove', (e) => {
    if (minimapControlsEnabled) {
        const dx = (e.movementX / minimapSize) * minimapCamera.right * 2;
        const dz = (e.movementY / minimapSize) * minimapCamera.top * 2;
        minimapCamera.position.x -= dx;
        minimapCamera.position.z += dz;
    }
});

/////////////////// LOOP \\\\\\\\\\\\\\\\\\\
let previousTime = performance.now();
const clock = new THREE.Clock();

function loop(time) {
    requestAnimationFrame(loop);
    stats.update();

    if (!previousTime) {
        previousTime = 0;
    }
    const deltaTime = (time - previousTime) / 1000;
    previousTime = time;

    let accelDirection = new THREE.Vector3();
    KeyMovement(accelDirection);

    const moveDirection = new THREE.Vector3();
    const UpVector = new THREE.Vector3(0, 1, 0).normalize();
    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forwardVector.y = 0;
    forwardVector.normalize();

    const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    rightVector.y = 0;
    rightVector.normalize();

    moveDirection.addScaledVector(forwardVector, -accelDirection.z);
    moveDirection.addScaledVector(rightVector, accelDirection.x);
    moveDirection.addScaledVector(UpVector, accelDirection.y);

    moveDirection.normalize();

    const frictionFactor = Math.exp(-FRICTION * deltaTime);
    PLAYER_VEL.x *= frictionFactor;
    PLAYER_VEL.y *= frictionFactor;
    PLAYER_VEL.z *= frictionFactor;

    PLAYER_VEL.addScaledVector(moveDirection, ACCELERATION * deltaTime * PLAYER_SPEED);

    const newCameraPosition = new THREE.Vector3().copy(camera.position).addScaledVector(PLAYER_VEL, deltaTime);
    camera.position.copy(newCameraPosition);
    PlayerMESH.position.copy(newCameraPosition);
    PlayerBox.setFromCenterAndSize(newCameraPosition, new THREE.Vector3(PLAYER_SIZE, PLAYER_HEIGHT, PLAYER_SIZE));

 
    chunkManager.update(camera.position);
    chunkManager.updateAllLODs();

    displayText.innerHTML =
        'Coords -> x: ' +
        camera.position.x.toFixed(2) +
        ' | y: ' +
        camera.position.y.toFixed(2) +
        ' | z: ' +
        camera.position.z.toFixed(2) +
        '<br>Look -> x: ' +
        camera.rotation.x.toFixed(2) +
        ' | y: ' +
        camera.rotation.y.toFixed(2) +
        ' | z: ' +
        camera.rotation.z.toFixed(2);

    performFrustumCulling(camera);
    shapes.forEach(updateObjectVerticies);

    renderMinimapIfChanged();
    composer.render();
}

loop(performance.now());