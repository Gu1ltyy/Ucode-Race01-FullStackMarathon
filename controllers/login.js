document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            login: login,
            password: password
        })
    })
    .then(response => response.text())
    .then(data => {
        const messageType = data === 'Login successful.' ? 'success' : 'error';
        showMessage(data, messageType);

        if (messageType === 'success') {
            setTimeout(function() {
                window.location.href = '/profile';
            }, 800);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        showMessage('An error occurred.', 'error');
    });
});

function showMessage(message, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.className = type;
}