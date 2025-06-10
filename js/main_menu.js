const opt_btn = document.getElementById('opt_btn');
const play_btn = document.getElementById('play_btn');
const g_btn = document.getElementById('g_btn');

g_btn.addEventListener('click', (e) => {
     document.location.href = './WebGl/test.html';
});

play_btn.addEventListener('click', (e) => {
    alert("Nope")
});

opt_btn.addEventListener('click', (e) => {
    document.location.href = './options_menu.html';
});

