function showError(errorText) {
    const errorBoxDiv = document.getElementById('error-box');
    const errorSpan = document.createElement('p');
    errorSpan.innerText = errorText;
    errorBoxDiv.appendChild(errorSpan);
    console.error(errorText);
}

export class sysGlclass {
    constructor(canvas,gl) {
        this.canvas = canvas
        this.gl = gl
    }
    clear() {
        this.gl.clearColor(0, 0.02, 0.03, 1.0)
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

}
