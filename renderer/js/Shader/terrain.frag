precision mediump float;

uniform float minHeight;
uniform float maxHeight;

varying float vHeight;

void main() {
    vec3 water = vec3(0.18, 0.54, 0.75);
    vec3 sand = vec3(0.86, 0.90, 0.26);
    vec3 stone = vec3(0.47, 0.47, 0.44);
    vec3 green = vec3(0.18, 0.75, 0.42);
    vec3 white = vec3(0.97, 0.98, 0.97);

    float waterToSand = smoothstep(-20.0, -5.0, vHeight);
    float sandToStone= smoothstep(-8.0, -4.0, vHeight);
    float stoneToGreen = smoothstep(-2.0, 0.0, vHeight);
    float greenToWhite = smoothstep(0.0, 30.0, vHeight);

    vec3 baseColor = mix(water, sand, waterToSand);
    baseColor = mix(baseColor, stone, sandToStone);
    baseColor = mix(baseColor, green, stoneToGreen);
    baseColor = mix(baseColor, white, greenToWhite);

    gl_FragColor = vec4(baseColor, 1.0);
}
