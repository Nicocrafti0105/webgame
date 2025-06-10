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
        const password = prompt('Please enter the password to open Developer Tools:');
        
        if (password !== correctPassword) {
            alert('Incorrect password! Developer tools are disabled.');
            event.preventDefault();
        }
    }
}

document.addEventListener('keydown', noDevTools);