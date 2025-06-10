function showError(errorText) {
    const errorBoxDiv = document.getElementById('error-box');
    const errorSpan = document.createElement('p');
    errorSpan.innerText = errorText;
    errorBoxDiv.appendChild(errorSpan);
    console.error(errorText);
  }


export class ShaderClass{
    constructor(canvas,gl){
        this.canvas = canvas
        this.gl = gl
    }
    ReadFragmentShader(file=String) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', `./shaders/frag/${file}.frag`, false);
        xhr.send(null);
        if (xhr.status === 200) return (xhr.responseText);
    }

    ReadFVertexShader(file=String) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', `./shaders/vert/${file}.vert`, false);
        xhr.send(null);
        if (xhr.status === 200) return (xhr.responseText);
    }

    compileShader( shaderType, sourceCode) {
        const shader = this.gl.createShader(shaderType);
        this.gl.shaderSource(shader, sourceCode);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const errorMessage = this.gl.getShaderInfoLog(shader);
            console.error(`Failed to compile shader : ${errorMessage}`);
            showError(`Failed to compile shader : ${errorMessage}`)
            return null;
        }
        return shader;
    }
    createShaderProgram(vertexShader, fragmentShader) {
        const shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);
    
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            const errorMessage = this.gl.getProgramInfoLog(shaderProgram);
            console.error(`Failed to link GPU program: ${errorMessage}`);
            showError(errorMessage)
            return null;
        }
    
        return shaderProgram;
    }
}
