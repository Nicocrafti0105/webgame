function showError(errorText) {
    const errorBoxDiv = document.getElementById('error-box');
    const errorSpan = document.createElement('p');
    errorSpan.innerText = errorText;
    errorBoxDiv.appendChild(errorSpan);
    console.error(errorText);
}

export class createrClass {
    constructor(canvas,gl) {
        this.canvas = canvas
        this.gl = gl
    }
    createTriangle(geometry,buffer,isStatic = Boolean) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(geometry), isStatic ? this.gl.STATIC_DRAW : this.gl.DYNAMIC_DRAW);
    }
}