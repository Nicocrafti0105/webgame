import * as THREE from 'three';
import NoiseModule from 'noisejs';
import { vars } from './index.js';

const Noise = NoiseModule.Noise;
const globalNoise = new Noise(Math.random() * 454.8456101);

const baseFrequency = 0.006;
const baseAmplitude = 120;
const octaves = 8;
const persistence = 0.75;
const lacunarity = 1.7;
const scale = 0.3;
const OUTLINE_HEIGHT_OFFSET = 1000;
const BaseDetail = 64;


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

const TerrainMat = await GetRessources()

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

    let terrainMaterial = TerrainMat
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

function createLODGeometry(baseGeometry, size, lodLevel) {
    const lodGeometry = new THREE.BufferGeometry();
    const basePositions = baseGeometry.attributes.position.array;
    const newPositions = [];
    const newIndices = [];

    const step = Math.pow(2, lodLevel)
    const lodSize = Math.floor(size / step);


    for (let x = 0; x <= size; x += step) {
        for (let z = 0; z <= size; z += step) {
            const originalIndex = x * (size + 1) + z;

            newPositions.push(
                basePositions[originalIndex * 3],
                basePositions[originalIndex * 3 + 1],
                basePositions[originalIndex * 3 + 2]
            );
        }
    }

    lodGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));

    for (let x = 0; x < lodSize; x++) {
        for (let z = 0; z < lodSize; z++) {
            const a = x * (lodSize + 1) + z;
            const b = (x + 1) * (lodSize + 1) + z;
            const c = (x + 1) * (lodSize + 1) + (z + 1);
            const d = x * (lodSize + 1) + (z + 1);

            newIndices.push(a, b, d);
            newIndices.push(b, c, d);
        }
    }
    lodGeometry.setIndex(newIndices);
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
        if (chunk.geometry && chunk.geometry !== chunk.userData.lodLevels[lod]) {
            chunk.geometry.dispose();
        }
        chunk.geometry = chunk.userData.lodLevels[lod];
        chunk.userData.currentLod = lod;
    }

    if (chunk.material && chunk.material.uniforms) {
        const minAlpha = 0.3;
        const maxAlpha = 1.0;
        const alpha = maxAlpha - (lod / (chunk.userData.lodLevels.length - 1)) * (maxAlpha - minAlpha);
        chunk.material.transparent = alpha < 1.0;
        if (!chunk.material.uniforms.uAlpha) {
            chunk.material.uniforms.uAlpha = { value: alpha };
        } else {
            chunk.material.uniforms.uAlpha.value = alpha;
        }
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