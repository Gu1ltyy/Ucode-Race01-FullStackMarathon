document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;

    if (password !== confirmPassword) {
        showMessage('Passwords do not match.', 'error');
        return;
    }

    if (!/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
        showMessage('Invalid email address.', 'error');
        return;
    }

    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            login: login,
            password: password,
            fullName: fullName,
            email: email
        })
    })
    .then(response => response.text())
    .then(data => {
        const messageType = data === 'User created successfully.' ? 'success' : 'error';
        showMessage(data, messageType);

        if (messageType === 'success') {
            document.getElementById('registerForm').reset();
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