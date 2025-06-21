import * as THREE from 'three';
import NoiseModule from 'noisejs';
import { vars } from './index.js';

const Noise = NoiseModule.Noise;
const globalNoise = new Noise(Math.random() * 454.8456101);

const baseFrequency = 0.006;
const baseAmplitude = 150;
const octaves = 7;
const persistence = 0.75;
const lacunarity = 1.6;
const scale = 0.4;
const OUTLINE_HEIGHT_OFFSET = 1000;
const BaseDetail = 64; // Base detail level

export function generateChunk(pos = new THREE.Vector2(0, 0), Size) {
    const worldX = pos.x * Size;
    const worldZ = pos.y * Size;

    const terrainVertices = [];
    const outlineVertices = [];

    for (let x = 0; x <= Size; x++) {
        for (let z = 0; z <= Size; z++) {
            const globalX = worldX + x;
            const globalZ = worldZ + z;

            let height = 0;
            let currentFrequency = baseFrequency;
            let currentAmplitude = baseAmplitude;
            let maxAmplitude = 0;

            for (let i = 0; i < octaves; i++) {
                const nx = globalX * currentFrequency * scale;
                const nz = globalZ * currentFrequency * scale;

                const noiseValue = globalNoise.perlin2(nx, nz);
                height += noiseValue * currentAmplitude;

                maxAmplitude += currentAmplitude;
                currentAmplitude *= persistence;
                currentFrequency *= lacunarity;
            }

            height = (height / maxAmplitude) * baseAmplitude;
            height += vars.baseY;

            terrainVertices.push(new THREE.Vector3(x, height, z));
            outlineVertices.push(new THREE.Vector3(x, OUTLINE_HEIGHT_OFFSET, z));
        }
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(terrainVertices.length * 3);
    for (let i = 0; i < terrainVertices.length; i++) {
        positions[i * 3] = terrainVertices[i].x;
        positions[i * 3 + 1] = terrainVertices[i].y;
        positions[i * 3 + 2] = terrainVertices[i].z;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const indices = [];
    for (let x = 0; x < Size; x++) {
        for (let z = 0; z < Size; z++) {
            const a = x * (Size + 1) + z;
            const b = (x + 1) * (Size + 1) + z;
            const c = (x + 1) * (Size + 1) + (z + 1);
            const d = x * (Size + 1) + (z + 1);

            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x88cc88, flatShading: true, side: THREE.DoubleSide });
    const terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
    terrainMesh.position.set(worldX, 0, worldZ);
    terrainMesh.name = 'chunk';
    terrainMesh.castShadow = true;
    terrainMesh.receiveShadow = true;
    terrainMesh.userData.lodLevels = [];
    for (let lodLevel = 0; lodLevel <= 5; lodLevel++) {
        const lodGeometry = createLODGeometry(geometry, Size, lodLevel, BaseDetail);
        terrainMesh.userData.lodLevels.push(lodGeometry);
    }
    terrainMesh.userData.currentLod = 0;

    return terrainMesh;
}

function createLODGeometry(baseGeometry, size, lodLevel, baseDetail) {
    const step = Math.pow(2, lodLevel);
    const lodVertices = [];
    const vertexMap = new Map();
    const basePositions = baseGeometry.attributes.position.array;

    function getBaseVertex(x, z) {
        const index = x * (size + 1) + z;
        return [
            basePositions[index * 3],
            basePositions[index * 3 + 1],
            basePositions[index * 3 + 2]
        ];
    }

    let idx = 0;
    for (let x = 0; x <= size; x++) {
        for (let z = 0; z <= size; z++) {
            const isBorder = (x === 0 || x === size || z === 0 || z === size);
            if (isBorder || (x % step === 0 && z % step === 0)) {
                const key = `${x},${z}`;
                if (!vertexMap.has(key)) {
                    const [vx, vy, vz] = getBaseVertex(x, z);
                    lodVertices.push(vx, vy, vz);
                    vertexMap.set(key, idx++);
                }
            }
        }
    }

    if (step > 1) {
        for (let x = 0; x <= size; x += step) {
            for (let z = 0; z <= size; z++) {
                if (z % step !== 0 && (x === 0 || x === size || z === 0 || z === size)) {
                    const key = `${x},${z}`;
                    if (!vertexMap.has(key)) {
                        const [vx, vy, vz] = getBaseVertex(x, z);
                        lodVertices.push(vx, vy, vz);
                        vertexMap.set(key, idx++);
                    }
                }
            }
        }
        for (let z = 0; z <= size; z += step) {
            for (let x = 0; x <= size; x++) {
                if (x % step !== 0 && (x === 0 || x === size || z === 0 || z === size)) {
                    const key = `${x},${z}`;
                    if (!vertexMap.has(key)) {
                        const [vx, vy, vz] = getBaseVertex(x, z);
                        lodVertices.push(vx, vy, vz);
                        vertexMap.set(key, idx++);
                    }
                }
            }
        }
    }

    const lodIndices = [];
    for (let x = 0; x < size; x += step) {
        for (let z = 0; z < size; z += step) {
            const keys = [
                `${x},${z}`,
                `${Math.min(x + step, size)},${z}`,
                `${Math.min(x + step, size)},${Math.min(z + step, size)}`,
                `${x},${Math.min(z + step, size)}`
            ];
            if (keys.every(k => vertexMap.has(k))) {
                const a = vertexMap.get(keys[0]);
                const b = vertexMap.get(keys[1]);
                const c = vertexMap.get(keys[2]);
                const d = vertexMap.get(keys[3]);
                lodIndices.push(a, b, d);
                lodIndices.push(b, c, d);
            }
        }
    }

    if (step > 1) {
        for (let x = 0; x <= size; x += step) {
            for (let z = 0; z < size; z++) {
                if (z % step !== 0) {
                    const z0 = z - (z % step);
                    const z1 = z0 + step;
                    if (z1 <= size) {
                        const keys = [
                            `${x},${z}`,
                            `${x},${z+1}`,
                            `${x},${z0}`,
                            `${x},${z1}`
                        ];
                        if (vertexMap.has(keys[0]) && vertexMap.has(keys[2]) && vertexMap.has(keys[3])) {
                            lodIndices.push(vertexMap.get(keys[0]), vertexMap.get(keys[2]), vertexMap.get(keys[3]));
                        }
                        if (vertexMap.has(keys[0]) && vertexMap.has(keys[1]) && vertexMap.has(keys[3])) {
                            lodIndices.push(vertexMap.get(keys[0]), vertexMap.get(keys[3]), vertexMap.get(keys[1]));
                        }
                    }
                }
            }
        }
        for (let z = 0; z <= size; z += step) {
            for (let x = 0; x < size; x++) {
                if (x % step !== 0) {
                    const x0 = x - (x % step);
                    const x1 = x0 + step;
                    if (x1 <= size) {
                        const keys = [
                            `${x},${z}`,
                            `${x+1},${z}`,
                            `${x0},${z}`,
                            `${x1},${z}`
                        ];
                        if (vertexMap.has(keys[0]) && vertexMap.has(keys[2]) && vertexMap.has(keys[3])) {
                            lodIndices.push(vertexMap.get(keys[0]), vertexMap.get(keys[2]), vertexMap.get(keys[3]));
                        }
                        if (vertexMap.has(keys[0]) && vertexMap.has(keys[1]) && vertexMap.has(keys[3])) {
                            lodIndices.push(vertexMap.get(keys[0]), vertexMap.get(keys[3]), vertexMap.get(keys[1]));
                        }
                    }
                }
            }
        }
    }

    for (let x = 0; x < size; x++) {
        let keys = [`${x},0`, `${x+1},0`, `${x+1},1`, `${x},1`];
        if (keys.every(k => vertexMap.has(k))) {
            const a = vertexMap.get(keys[0]);
            const b = vertexMap.get(keys[1]);
            const c = vertexMap.get(keys[2]);
            const d = vertexMap.get(keys[3]);
            lodIndices.push(a, b, d);
            lodIndices.push(b, c, d);
        }
        keys = [`${x},${size-1}`, `${x+1},${size-1}`, `${x+1},${size}`, `${x},${size}`];
        if (keys.every(k => vertexMap.has(k))) {
            const a = vertexMap.get(keys[0]);
            const b = vertexMap.get(keys[1]);
            const c = vertexMap.get(keys[2]);
            const d = vertexMap.get(keys[3]);
            lodIndices.push(a, b, d);
            lodIndices.push(b, c, d);
        }
    }

    for (let z = 0; z < size; z++) {
        let keys = [`0,${z}`, `1,${z}`, `1,${z+1}`, `0,${z+1}`];
        if (keys.every(k => vertexMap.has(k))) {
            const a = vertexMap.get(keys[0]);
            const b = vertexMap.get(keys[1]);
            const c = vertexMap.get(keys[2]);
            const d = vertexMap.get(keys[3]);
            lodIndices.push(a, b, d);
            lodIndices.push(b, c, d);
        }
        keys = [`${size-1},${z}`, `${size},${z}`, `${size},${z+1}`, `${size-1},${z+1}`];
        if (keys.every(k => vertexMap.has(k))) {
            const a = vertexMap.get(keys[0]);
            const b = vertexMap.get(keys[1]);
            const c = vertexMap.get(keys[2]);
            const d = vertexMap.get(keys[3]);
            lodIndices.push(a, b, d);
            lodIndices.push(b, c, d);
        }
    }

    const lodGeometry = new THREE.BufferGeometry();
    lodGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lodVertices), 3));
    lodGeometry.setIndex(lodIndices);
    lodGeometry.computeVertexNormals();

    return lodGeometry;
}

export function updateChunkLOD(chunk, camera) {
    const realPos = new THREE.Vector3().copy(chunk.position);
    realPos.setY(camera.position.y);
    const cameraDistance = camera.position.distanceTo(realPos);
    let lod = 0;

    if (cameraDistance > vars.chunkSize * vars.LodFactor) lod = 1;
    if (cameraDistance > vars.chunkSize * vars.LodFactor * 2.5) lod = 2;
    if (cameraDistance > vars.chunkSize * vars.LodFactor * 4) lod = 3;
    if (cameraDistance > vars.chunkSize * vars.LodFactor * 5.5) lod = 4;
    if (lod >= chunk.userData.lodLevels.length) lod = chunk.userData.lodLevels.length - 1;

    if (lod !== chunk.userData.currentLod) {
        chunk.geometry.dispose();
        chunk.geometry = chunk.userData.lodLevels[lod];
        chunk.userData.currentLod = lod;
    }
}

export function genNoiseMap(terrainWidth, terrainDepth) {
    const terrainVertices = [];
    const offsetX = terrainWidth / 2;
    const offsetZ = terrainDepth / 2;

    for (let x = 0; x < terrainWidth; x++) {
        for (let z = 0; z < terrainDepth; z++) {
            let height = 0;
            let maxAmplitude = 0;
            let frequency = baseFrequency;
            let amplitude = baseAmplitude;

            for (let i = 0; i < octaves; i++) {
                const nx = x * frequency * scale;
                const nz = z * frequency * scale;

                const noiseValue = globalNoise.perlin2(nx, nz);
                height += noiseValue * amplitude;

                maxAmplitude += amplitude;
                amplitude *= persistence;
                frequency *= lacunarity;
            }

            height = (height / maxAmplitude) * baseAmplitude;
            terrainVertices.push(new THREE.Vector3(x - offsetX, height, z - offsetZ));
        }
    }

    return terrainVertices;
}
