import * as THREE from 'three';
import NoiseModule from 'noisejs';
const Noise = NoiseModule.Noise;

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
