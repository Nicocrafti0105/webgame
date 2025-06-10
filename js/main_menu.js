const opt_btn = document.getElementById('opt_btn');
const play_btn = document.getElementById('play_btn');
const g_btn = document.getElementById('g_btn');

play_btn.addEventListener('click', (e) => {
     document.location.href = './renderer/index.html';
});

opt_btn.addEventListener('click', (e) => {
    document.location.href = './options_menu.html';
});

