import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import NoiseModule from 'noisejs';
import { GUI } from 'dat.gui';
import Stats from 'three/addons/libs/stats.module.js';

////////////////////////////// BASE ////////////////////////////////

function dtr(degrees) {
    return degrees * (Math.PI / 180);
}

const Noise = NoiseModule.Noise;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x858792);
const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 50;
controls.maxDistance = 500;


const ambientLight = new THREE.AmbientLight(0xffffff,1.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.6);
dirLight.position.set(50, 150, 50);
scene.add(dirLight);
dirLight.castShadow = true
dirLight.shadow.mapSize.width = 128;
dirLight.shadow.mapSize.height = 128;

dirLight.target.position.set(0, 0, 0);
scene.add(dirLight.target);



////////////////////////////// GENERATION ////////////////////////////////

let data = {
    mapWireframe: false,
    chunkOutlineEnabled: true,
    seed: Math.random(),
    baseFrequency: 0.008,
    baseAmplitude: 100,
    octaves: 6,
    persistence: 0.75,
    lacunarity: 1.6,
    scale: 0.4,
    chunkSize: 8,
    renderDistance: 8,
    cameraOffset: 120,
};

const ChunkMaterial = new THREE.MeshStandardMaterial({
    color: data.mapWireframe ? 0xfb3936 : 0xcbccd3,
    wireframe: data.mapWireframe,
    wireframeLinewidth: 1,
    side: THREE.DoubleSide
});


let GroundMesh = new THREE.Mesh();
scene.add(GroundMesh);

GroundMesh.castShadow = true
GroundMesh.receiveShadow = true

const loadedChunks = new Map();
const loadedChunkOutlines = new Map();


////////////////////////// MINIMAP //////////////////////////////

let lastCameraPosition = new THREE.Vector3();

function renderMinimapIfChanged() {
    if (!camera.position.equals(lastCameraPosition)) {
        minimapCamera.position.set(player.x, 1250, player.z);
        minimapCamera.lookAt(player.x, 0, player.z);
        minimapRenderer.render(scene, minimapCamera);
        lastCameraPosition.copy(camera.position);
    }
}

const minimapSize = 400;
const minimapRenderer = new THREE.WebGLRenderer({ antialias: true });
minimapRenderer.setSize(minimapSize, minimapSize);
minimapRenderer.domElement.style.position = 'absolute';
minimapRenderer.domElement.style.bottom = '10px';
minimapRenderer.domElement.style.right = '10px';
minimapRenderer.domElement.style.border = '2px solid #222';
minimapRenderer.domElement.style.zIndex = '10';
document.body.appendChild(minimapRenderer.domElement);


const minimapCamera = new THREE.OrthographicCamera(
    -data.renderDistance * data.chunkSize,
    data.renderDistance * data.chunkSize,
    data.renderDistance * data.chunkSize,
    -data.renderDistance * data.chunkSize,
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


////////////////////////// LOD + QuadTree //////////////////////////////



////////////////////////// Chunks //////////////////////////////

function GetChunkNoise(globalOriginX, globalOriginZ) {
    const noise = new Noise(data.seed);
    const ChunkVertices = [];
    const areaSize = data.chunkSize

    for (let x = 0; x <= areaSize; x++) {
        for (let z = 0; z <= areaSize; z++) {
            let height = 0;
            let maxAmplitude = 0;
            let frequency = data.baseFrequency;
            let amplitude = data.baseAmplitude;

            for (let i = 0; i < data.octaves; i++) {
                const globalX = globalOriginX + x;
                const globalZ = globalOriginZ + z;

                const nx = globalX * frequency * data.scale;
                const nz = globalZ * frequency * data.scale;
                const noiseValue = noise.perlin2(nx, nz);

                if (isNaN(noiseValue) || !isFinite(noiseValue)) {
                    height += 0 * amplitude;
                } else {
                    height += noiseValue * amplitude;
                }
                maxAmplitude += amplitude;
                amplitude *= data.persistence;
                frequency *= data.lacunarity;
            }

            if (maxAmplitude === 0) {
                height = 0;
            } else {
                height = (height / maxAmplitude) * data.baseAmplitude;
            }

            if (isNaN(height) || !isFinite(height)) {
                height = 0;
            }

            ChunkVertices.push(new THREE.Vector3(x - areaSize / 2, height, z - areaSize / 2));
        }
    }
    return ChunkVertices;
}

function generateChunkGeometry(chunkPos) {
    const chunkSize = data.chunkSize;
    const globalStartX = chunkPos.x * chunkSize;
    const globalStartZ = chunkPos.y * chunkSize;

    const NoiseMap = GetChunkNoise(globalStartX, globalStartZ);
    const verticesData = [];
    const indices = [];

    for (let i = 0; i < NoiseMap.length; i++) {
        const v = NoiseMap[i];
        verticesData.push(v.x, v.y, v.z);
    }


    const side = Math.sqrt(NoiseMap.length);
    for (let x = 0; x < side - 1; x++) {
        for (let z = 0; z < side - 1; z++) {
            const topLeft = x * side + z;
            const topRight = topLeft + 1;
            const bottomLeft = (x + 1) * side + z;
            const bottomRight = bottomLeft + 1;

            indices.push(topLeft, topRight, bottomLeft);
            indices.push(topRight, bottomRight, bottomLeft);
        }
    }

    if (verticesData.some(isNaN)) {
        return null;
    }

    const Geo = new THREE.BufferGeometry();
    Geo.setAttribute('position', new THREE.Float32BufferAttribute(verticesData, 3));
    Geo.setIndex(indices);
    return Geo;
}


function GenerateChunk(chunk = new THREE.Vector2(0, 0)) {
    const mesh = new THREE.Mesh();
    const geometry = generateChunkGeometry(chunk);
    geometry.computeVertexNormals()

    if (!geometry) {
        return null;
    }

    mesh.geometry = geometry;
    mesh.material = ChunkMaterial
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.position.set(
        chunk.x * data.chunkSize,
        0,
        chunk.y * data.chunkSize
    );

    return mesh;
}


////////////////////////// Outline //////////////////////////////


function GenerateChunkOutline(chunkPos, meshYOffset, chunkSizeOverride = data.chunkSize) {
    const halfChunkSize = chunkSizeOverride / 2;

    const points = [
        new THREE.Vector3(-halfChunkSize, meshYOffset, -halfChunkSize),
        new THREE.Vector3(halfChunkSize, meshYOffset, -halfChunkSize),
        new THREE.Vector3(halfChunkSize, meshYOffset, halfChunkSize),
        new THREE.Vector3(-halfChunkSize, meshYOffset, halfChunkSize),
        new THREE.Vector3(-halfChunkSize, meshYOffset, -halfChunkSize)
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x1700ff, linewidth: 2 });
    const line = new THREE.Line(geometry, material);

    line.position.setX(chunkPos.x * data.chunkSize);
    line.position.setZ(chunkPos.y * data.chunkSize);
    line.position.setY(meshYOffset + 50);

    line.visible = data.chunkOutlineEnabled;

    return line;
}



////////////////////////// Dispose //////////////////////////////

function disposeChunk(chunkMesh) {
    scene.remove(chunkMesh);
    if (chunkMesh.geometry) {
        chunkMesh.geometry.dispose();
    }
    if (chunkMesh.material) {
        chunkMesh.material.dispose();
    }
}

function disposeChunkOutline(outlineMesh) {
    scene.remove(outlineMesh);
    if (outlineMesh.geometry) {
        outlineMesh.geometry.dispose();
    }
    if (outlineMesh.material) {
        outlineMesh.material.dispose();
    }
}



function cleanAllChunks() {
    loadedChunks.forEach((chunkMesh) => {
        disposeChunk(chunkMesh);
    });
    loadedChunks.clear();

    loadedChunkOutlines.forEach((outlineMesh) => {
        disposeChunkOutline(outlineMesh);
    });
    loadedChunkOutlines.clear();
}




////////////////////////// View //////////////////////////////

function GetPlayerChunk(pos = new THREE.Vector3(0, 0, 0)) {
    const chunkX = Math.floor(pos.x / data.chunkSize);
    const chunkZ = Math.floor(pos.z / data.chunkSize);
    return new THREE.Vector2(chunkX, chunkZ);
}

function GetViewableChunks(pos = new THREE.Vector3(0, 0, 0)) {
    const chunksToLoad = [];
    const renderRadius = data.renderDistance;
    const playerChunkCoords = GetPlayerChunk(pos);

    for (let chunkX = -renderRadius; chunkX <= renderRadius; chunkX++) {
        for (let chunkZ = -renderRadius; chunkZ <= renderRadius; chunkZ++) {
            const worldChunkX = playerChunkCoords.x + chunkX;
            const worldChunkZ = playerChunkCoords.y + chunkZ;
            chunksToLoad.push(new THREE.Vector2(worldChunkX, worldChunkZ));
        }
    }
    return chunksToLoad;
}

////////////////////////////// PLAYER & CHUNK MANAGEMENT ////////////////////////////////

let player = new THREE.Vector3(0, 0, 0);
let playermesh;
let playerForwardArrow;
let fixedForwardArrow;

const speed = 100;
const keysPressed = {};

let lastPlayerChunk = new THREE.Vector2(Infinity, Infinity);

function updateChunks() {
    const currentViewableChunks = GetViewableChunks(player);
    const newLoadedChunks = new Map();
    const newLoadedChunkOutlines = new Map();

    currentViewableChunks.forEach(chunkPos => {
        const chunkKey = `${chunkPos.x},${chunkPos.y}`;
        
        if (!loadedChunks.has(chunkKey)) {
            const mesh = GenerateChunk(chunkPos);
            if (mesh) {
                scene.add(mesh);
                newLoadedChunks.set(chunkKey, mesh);
            }
        } else {
            newLoadedChunks.set(chunkKey, loadedChunks.get(chunkKey));
            loadedChunks.delete(chunkKey);
        }

        if (!loadedChunkOutlines.has(chunkKey)) {
            const outline = GenerateChunkOutline(chunkPos, 0);
            if (outline) {
                scene.add(outline);
                newLoadedChunkOutlines.set(chunkKey, outline);
            }
        } else {
            newLoadedChunkOutlines.set(chunkKey, loadedChunkOutlines.get(chunkKey));
            loadedChunkOutlines.delete(chunkKey);
        }
    });

    loadedChunks.forEach(chunkMesh => {
        disposeChunk(chunkMesh);
    });
    loadedChunks.clear();
    newLoadedChunks.forEach((mesh, key) => {
        loadedChunks.set(key, mesh);
    });

    loadedChunkOutlines.forEach(outlineMesh => {
        disposeChunkOutline(outlineMesh);
    });
    loadedChunkOutlines.clear();
    newLoadedChunkOutlines.forEach((outline, key) => {
        loadedChunkOutlines.set(key, outline);
    });

}

////////////////////////////// INIT ////////////////////////////////

function init() {
    if (!playermesh) {
        playermesh = new THREE.Mesh(new THREE.BoxGeometry(5, 200, 5), new THREE.MeshStandardMaterial({ color: 0x2fbb2d, transparent: true, opacity: 0.5 }));
        scene.add(playermesh);

        const movingArrowDir = new THREE.Vector3(0, 0, -1);
        const movingArrowOrigin = new THREE.Vector3(0, 50, 0);
        const movingArrowLength = 50;
        const movingArrowHex = 0xffff00;
        playerForwardArrow = new THREE.ArrowHelper(movingArrowDir, movingArrowOrigin, movingArrowLength, movingArrowHex);
        playermesh.add(playerForwardArrow);
        
        const fixedArrowDir = new THREE.Vector3(0, 0, -1);
        const fixedArrowOrigin = new THREE.Vector3(0, 60, -20);
        const fixedArrowLength = 30;
        const fixedArrowHex = 0xffffff;
        const fixedArrowHeadLength = 10;
        const fixedArrowHeadWidth = 5;
        fixedForwardArrow = new THREE.ArrowHelper(fixedArrowDir, fixedArrowOrigin, fixedArrowLength, fixedArrowHex, fixedArrowHeadLength, fixedArrowHeadWidth);
        fixedForwardArrow.line.material.transparent = true;
        fixedForwardArrow.line.material.opacity = 0.5;
        fixedForwardArrow.cone.material.transparent = true;
        fixedForwardArrow.cone.material.opacity = 0.5;
        playermesh.add(fixedForwardArrow);
    }

    if (playermesh && playermesh.material) {
        playermesh.material.wireframe = data.mapWireframe;
    }

    player.set(data.chunkSize / 2, data.baseAmplitude / 2, data.chunkSize / 2);
    playermesh.position.copy(player);

    controls.target.copy(player);
    camera.position.copy(player).add(new THREE.Vector3(0, data.cameraOffset, data.cameraOffset));
    controls.update();

    cleanAllChunks();
    updateChunks();
}

init();
renderMinimapIfChanged()
////////////////////////////// GUI ////////////////////////////////

const gui = new GUI();

gui.add(data, "chunkOutlineEnabled").name("Chunk Outlines").onChange(() => {
    loadedChunkOutlines.forEach(outlineMesh => {
        outlineMesh.visible = data.chunkOutlineEnabled;
    });
});

gui.add(data, "mapWireframe").name("Map Wireframe").onChange(() => {
    loadedChunks.forEach(chunkMesh => {
        if (chunkMesh.material) {
            chunkMesh.material.wireframe = data.mapWireframe;
            chunkMesh.material.color.set(data.mapWireframe ? 0xfb3936 : 0xcbccd3);
        }
    });

    if (playermesh && playermesh.material) {
        playermesh.material.wireframe = data.mapWireframe;
    }
});


const noiseFolder = gui.addFolder("NOISE");
noiseFolder.add(data, "seed").onChange(init);
noiseFolder.add(data, "baseFrequency", 0.001, 0.05).step(0.001).onChange(init);
noiseFolder.add(data, "baseAmplitude", 10, 300).step(1).onChange(init);
noiseFolder.add(data, "octaves", 1, 10).step(1).onChange(init);
noiseFolder.add(data, "persistence", 0.1, 1.0).step(0.01).onChange(init);
noiseFolder.add(data, "lacunarity", 1.0, 3.0).step(0.1).onChange(init);
noiseFolder.add(data, "scale", 0.1, 2.0).step(0.01).onChange(init);
noiseFolder.open();

const ChunkFolder = gui.addFolder("Chunks");
ChunkFolder.add(data, "renderDistance", 1, 64,1).onChange(init);
ChunkFolder.add(data, "chunkSize", 1,32,1).onChange(init);
ChunkFolder.open();


const orbitFolder = gui.addFolder("OrbitControls");
orbitFolder.add(controls, "minDistance", 10, 300).name("Min Orbit Dist").onChange(() => controls.update());
orbitFolder.add(controls, "maxDistance", 100, 1000).name("Max Orbit Dist").onChange(() => controls.update());
orbitFolder.add(controls, "enableDamping").name("Enable Damping").onChange(() => controls.update());
orbitFolder.add(controls, "dampingFactor", 0.01, 0.2).name("Damping Factor").onChange(() => controls.update());
orbitFolder.add(data, "cameraOffset", 50, 250, 1).name("Initial Camera Dist").onChange(() => {
    camera.position.copy(player).add(new THREE.Vector3(0, data.cameraOffset, data.cameraOffset));
    controls.update();
});
orbitFolder.open();

gui.add({ minimap: true }, 'minimap').name('Show Minimap').onChange(v => {
    minimapRenderer.domElement.style.display = v ? '' : 'none';
});
gui.add({ lodMinimap: true }, 'lodMinimap').name('Show lodMinimap').onChange(v => {
    LODRenderer.domElement.style.display = v ? '' : 'none';
});

////////////////////////////// LOOP ////////////////////////////////

function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    if (!animate.lastTime) animate.lastTime = currentTime;
    const deltaTime = (currentTime - animate.lastTime) / 1000;
    animate.lastTime = currentTime;

    const movementAmount = speed * deltaTime;

    let currentDirection = new THREE.Vector3(0, 0, 0);

    if (keysPressed['z']) {
        player.z -= movementAmount;
        currentDirection.z -= 1;
    }
    if (keysPressed['s']) {
        player.z += movementAmount;
        currentDirection.z += 1;
    }
    if (keysPressed['q']) {
        player.x -= movementAmount;
        currentDirection.x -= 1;
    }
    if (keysPressed['d']) {
        player.x += movementAmount;
        currentDirection.x += 1;
    }

    playermesh.position.copy(player);

    if (currentDirection.lengthSq() > 0) {
        currentDirection.normalize();
        playerForwardArrow.setDirection(currentDirection);
    }
    
    controls.target.copy(player);
    controls.update();

        
    dirLight.position.copy(player)
    dirLight.position.add(new THREE.Vector3(data.cameraOffset * 500,data.cameraOffset * 500,data.cameraOffset* 500))
    dirLight.lookAt(new THREE.Vector3().copy(player))
    dirLight.target.position.copy(player);


    const currentPlayerChunk = GetPlayerChunk(player);
    if (!currentPlayerChunk.equals(lastPlayerChunk)) {
        updateChunks();
        lastPlayerChunk.copy(currentPlayerChunk);
    }

    renderMinimapIfChanged()    
    renderer.render(scene,camera)
    stats.update();
}
animate();

////////////////////////////// LISTENERS ////////////////////////////////

window.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'y') {
        window.location.href = './index.html'
    }
    if (e.key.toLowerCase() === 't') {
        window.location.href = './Terrain.html'
    }
    if (e.key.toLowerCase() === 'u') {
        window.location.href = './LOD.html'
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