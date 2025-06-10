import * as THREE from 'three';
import NoiseModule from 'noisejs';
import { vars } from './index.js';
const Noise = NoiseModule.Noise;

const noise = new Noise(Math.random());

const baseFrequency = 0.006;
const baseAmplitude = 150;
const octaves = 7;
const persistence = 0.75;
const lacunarity = 1.6;
const scale = 0.4;

const OUTLINE_HEIGHT_OFFSET = 1000;

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

                const noiseValue = noise.perlin2(nx, nz);
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

    const outlineCornerVertices = [
        new THREE.Vector3(0, OUTLINE_HEIGHT_OFFSET, 0),
        new THREE.Vector3(Size, OUTLINE_HEIGHT_OFFSET, 0),
        new THREE.Vector3(Size, OUTLINE_HEIGHT_OFFSET, Size),
        new THREE.Vector3(0, OUTLINE_HEIGHT_OFFSET, Size),
    ];

    const terrainGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, noise.perlin2(worldX * baseFrequency * scale, worldZ * baseFrequency * scale) * baseAmplitude + vars.baseY, 0),
        new THREE.Vector3(Size, noise.perlin2((worldX + Size) * baseFrequency * scale, worldZ * baseFrequency * scale) * baseAmplitude + vars.baseY, 0),
        new THREE.Vector3(Size, noise.perlin2((worldX + Size) * baseFrequency * scale, (worldZ + Size) * baseFrequency * scale) * baseAmplitude + vars.baseY, Size),
        new THREE.Vector3(0, noise.perlin2(worldX * baseFrequency * scale, (worldZ + Size) * baseFrequency * scale) * baseAmplitude + vars.baseY, Size),
    ]);
    const terrainMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const terrainMesh = new THREE.LineLoop(terrainGeometry, terrainMaterial);
    terrainMesh.position.set(worldX, 0, worldZ);
    terrainMesh.name = 'chunk';

    const outlineGeometry = new THREE.BufferGeometry().setFromPoints(outlineCornerVertices);
    const outlineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: vars.showChunksOutline ? 1.0 : 0.0,
    });
    const outlineMesh = new THREE.LineLoop(outlineGeometry, outlineMaterial);
    outlineMesh.position.set(worldX, 0, worldZ);
    outlineMesh.name = 'chunkOutline';

    terrainMesh.userData.outlineMesh = outlineMesh;

    return terrainMesh;
}

export function updateChunkLOD(chunk, camera) {
    const cameraDistance = camera.position.distanceTo(chunk.position);
    let lod = 1;

    if (cameraDistance > vars.chunkSize * vars.LodFactor) {
        lod = 2;
    }
    if (cameraDistance > vars.chunkSize * vars.LodFactor * 2.5) {
        lod = 3;
    }
    if (cameraDistance > vars.chunkSize * vars.LodFactor * 4) {
        lod = 4;
    }
    if (cameraDistance > vars.chunkSize * vars.LodFactor * 5.5) {
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

export function genNoiseMap(terrainWidth, terrainDepth) {
    const noise = new Noise(Math.random());

    const baseFrequency = 0.006;
    const baseAmplitude = 150;
    const octaves = 7;
    const persistence = 0.75;
    const lacunarity = 1.6;
    const scale = 0.4;

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

                const noiseValue = noise.perlin2(nx, nz);
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