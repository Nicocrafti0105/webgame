const correctPassword = 'password';

function showContextMenu(event) {
    const password = prompt('Please enter the password to open the context menu:');
    
    if (password !== correctPassword) {
        alert('Incorrect password! Context menu is disabled.');
        event.preventDefault();
    }
}

document.addEventListener('contextmenu', showContextMenu);

function noDevTools(event) {
    if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && event.key === 'I') || (event.ctrlKey && event.shiftKey && event.key === 'C')) {
        alert('Please use F12 or right click to open Developer Tools');
        event.preventDefault();
    }
}

document.addEventListener('keydown', noDevTools);