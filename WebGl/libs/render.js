import { sysGlclass } from "./sys.js";

function showError(errorText) {
    const errorBoxDiv = document.getElementById('error-box');
    const errorSpan = document.createElement('p');
    errorSpan.innerText = errorText;
    errorBoxDiv.appendChild(errorSpan);
    console.error(errorText);
  }


export class RenderClass {
    constructor(canvas,gl) {
        this.canvas = canvas
        this.gl = gl
    }

    getAttribLocation(program, attribName) {
        const location = this.gl.getAttribLocation(program, attribName);
        if (location < 0) {
            console.error(`Failed to get attribute location for ${attribName}`);
            showError(`Failed to get attribute location for ${attribName}`)
            return null;
        }
        return location;
    }
    AssembleAndDraw(buffer,attrib,arraysNb,isNormalized){
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.vertexAttribPointer(attrib, 2, this.gl.FLOAT, isNormalized, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, arraysNb);
    }

}
