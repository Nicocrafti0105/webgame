#version 300 es
precision mediump float;

in vec2 vertexPosition;
uniform vec2 u_offset;
uniform vec2 u_scale;
uniform float u_angle;

void main() {
    float cosA = cos(u_angle);
    float sinA = sin(u_angle);
    mat2 rotationMatrix = mat2(cosA, -sinA, sinA, cosA);

    vec2 scaledPosition = vertexPosition * u_scale;
    vec2 rotatedPosition = rotationMatrix * scaledPosition;

    gl_Position = vec4(rotatedPosition + u_offset, 0.0, 1.0);
}