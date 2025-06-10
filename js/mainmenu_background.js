const bg = document.getElementById('background');
const sensitivity = 30;
const overshootFactor = 1.8;
const smoothFactor = 0.1;

let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;

document.addEventListener('mousemove', (e) => {
    const { clientX, clientY } = e;
    const xOffset = (clientX / window.innerWidth - 0.5) * -sensitivity;
    const yOffset = (clientY / window.innerHeight - 0.5) * -sensitivity;

    targetX = xOffset * overshootFactor;
    targetY = yOffset * overshootFactor;
});

function animate() {
    currentX += (targetX - currentX) * smoothFactor;
    currentY += (targetY - currentY) * smoothFactor;

    bg.style.transform = `translate(${currentX}px, ${currentY}px)`;

    requestAnimationFrame(animate);
}

animate();