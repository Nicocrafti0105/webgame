#version 300 es
precision mediump float;

out vec4 outputColor;
// in vec2 vTexCoord;
// uniform sampler2D uSampler;

void main() {
    outputColor = vec4(0.52f, 0.45f, 0.94f, 1.0f);
    //outputColor = texture(uSampler,vTexCoord);
}