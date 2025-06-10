let sliderY = document.getElementById("Y_pos");
let sliderX = document.getElementById("X_pos");
let sliderR = document.getElementById("rotation");
let sliderS = document.getElementById("scale");
let outputY = document.querySelector("#Y_pos_otp");
let outputX = document.querySelector("#X_pos_otp");
let outputR = document.querySelector("#rotation_otp");
let outputS = document.querySelector("#scale_otp");

outputY.textContent = `Y pos : 0`;
outputX.textContent = `X pos : 0`;
outputR.textContent = `Rotation : 0`;
outputS.textContent = `Scale : 1`;

sliderY.addEventListener('input', function() {
    outputY.textContent = `Y pos : ${this.value  / 1000}`;
})
    
sliderX.addEventListener('input', function() {
    outputX.textContent = `X pos : ${this.value  / 1000}`;
})

sliderR.addEventListener('input', function() {
    outputR.textContent = `Rotation : ${this.value / 10}`;
})

sliderS.addEventListener('input', function() {
    outputS.textContent = `Scale : ${this.value / 100}`;
})