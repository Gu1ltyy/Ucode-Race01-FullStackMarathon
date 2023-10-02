document.getElementById('reminderForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const login = document.getElementById('login').value;

    fetch('/password-reminder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            login: login
        })
    })
    .then(response => response.text())
    .then(data => {
        const messageType = data === 'Password reminder sent to your email.' ? 'success' : 'error';
        showMessage(data, messageType);

        if (data === 'User not found.') {
            const registerLink = document.createElement('a');
            registerLink.href = '/register';
            registerLink.textContent = 'Would you like to register?';
            document.getElementById('message').appendChild(document.createElement('br'));
            document.getElementById('message').appendChild(registerLink);
        }

        if (data === 'Password sent to your email.') {
            setTimeout(function() {
                window.location.href = '/login';
            }, 1000);
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