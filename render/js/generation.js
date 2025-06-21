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

    const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x88cc88, flatShading: true,side: THREE.DoubleSide });
    const terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
    terrainMesh.position.set(worldX, 0, worldZ);
    terrainMesh.name = 'chunk';

    return terrainMesh;
}

export function updateChunkLOD(chunk, camera) {
    const realPos = new THREE.Vector3().copy(chunk.position)
    realPos.setY(camera.position.y)
    const cameraDistance = camera.position.distanceTo(realPos);
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

    // switch (lod) {
    //     case 1:
    //         chunk.material.color.set(0xff0000);
    //         break;
    //     case 2:
    //         chunk.material.color.set(0x00ff00);
    //         break;
    //     case 3:
    //         chunk.material.color.set(0x0000ff);
    //         break;
    //     case 4:
    //         chunk.material.color.set(0xff00ff);
    //         break;
    //     case 5:
    //         chunk.material.color.set(0xffff00);
    //         break;
    //     default:
    //         chunk.material.color.set(0xffffff);
    //         break;
    // }
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