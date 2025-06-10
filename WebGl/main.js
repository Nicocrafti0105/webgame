import { sysGlclass } from "./libs/sys.js";
import { ShaderClass } from "./libs/shader.js";
import { RenderClass } from "./libs/render.js";
import { createrClass } from "./libs/builder.js";
import { verticiesClass } from "./verticies.js";
// import { xParam } from "./test_parameters.js";


/**############################################### WEBGL init #####################################################**/

const canvas = document.getElementById('webgl')
const gl = canvas.getContext('webgl2');

/**############################################### CLASS import #####################################################**/
const sysGl = new sysGlclass(canvas,gl)
const shaderGl = new ShaderClass(canvas,gl)
const renderGl = new RenderClass(canvas,gl)
const createGl = new createrClass(canvas,gl)
const vertGeo = new verticiesClass()


/**############################################### functions #####################################################**/
// function showMainError(errorText) {
//     const errorBoxDiv = document.getElementById('error-box');
//     const errorSpan = document.createElement('p');
//     errorSpan.innerText = errorText;
//     errorBoxDiv.appendChild(errorSpan);
//     console.error(errorText);
//   }



const TriangleGeoBuffer = gl.createBuffer();
createGl.createTriangle(vertGeo.triangleVerticies,TriangleGeoBuffer,true);

// const SecondTriangleGeoBuffer = gl.createBuffer();
// createGl.createTriangle(vertGeo.secondTriangleVerticies,SecondTriangleGeoBuffer, true);

const texCoordBuffer = gl.createBuffer();
createGl.createTriangle(vertGeo.secondTriangleVerticies,texCoordBuffer, false);

const vertexShader = shaderGl.compileShader(shaderGl.gl.VERTEX_SHADER,shaderGl.ReadFVertexShader('triangle'));
const fragmentShader = shaderGl.compileShader(shaderGl.gl.FRAGMENT_SHADER,shaderGl.ReadFragmentShader("triangle"));
const triangleShaderProgram = shaderGl.createShaderProgram(vertexShader,fragmentShader);
const vertexPositionAttribLocation = renderGl.getAttribLocation(triangleShaderProgram, 'vertexPosition');


canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
gl.viewport(0,0,canvas.width, canvas.height);

sysGl.clear()

gl.useProgram(triangleShaderProgram);
gl.enableVertexAttribArray(vertexPositionAttribLocation);

renderGl.AssembleAndDraw(TriangleGeoBuffer,vertexPositionAttribLocation,3,false)
// renderGl.AssembleAndDraw(SecondTriangleGeoBuffer,vertexPositionAttribLocation,3,false)


let position = {x:0.0,y:0.0}
let scale = {x:1.0,y:1.0}
let rotationAngle = 0.0;

let uOffset = gl.getUniformLocation(triangleShaderProgram, "u_offset");
let uAngle = gl.getUniformLocation(triangleShaderProgram, "u_angle");
let uScale = gl.getUniformLocation(triangleShaderProgram, "u_scale");

function reDraw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform2f(uOffset,  position.x, position.y);
    gl.uniform1f(uAngle, rotationAngle)
    gl.uniform2f(uScale, scale.x,scale.y)
    gl.drawArrays(gl.TRIANGLES, 0,3);
}

document.getElementById("X_pos").addEventListener("input", function(event) {
    position.x = parseFloat(event.target.value / 1000 - 0.2);
    reDraw();
});
document.getElementById("Y_pos").addEventListener("input", function(event) {
    position.y = parseFloat(event.target.value / 1000 - 0.2);
    reDraw();
});
document.getElementById("rotation").addEventListener("input", function (event) {
    let degrees = parseFloat(event.target.value / 10);
    rotationAngle = degrees * (Math.PI / 180);
    reDraw();
});
document.getElementById("scale").addEventListener("input", function (event) {
    let scaleValue  = parseFloat(event.target.value / 250);
    scale.x = scaleValue;
    scale.y = scaleValue;
    reDraw();
});


function mainLoop(){
    reDraw();
    requestAnimationFrame(mainLoop)
}
mainLoop()
requestAnimationFrame(mainLoop)
