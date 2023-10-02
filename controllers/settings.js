window.onload = function() {
    fetch('/get-user-data', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    })
    .then(response => response.json())
    .then(data => {
        oldLogin = data.login;
        document.getElementById('login').value = data.login;
        document.getElementById('fullName').value = data.fullName;
        document.getElementById('email').value = data.email;
    })
    .catch((error) => {
        console.error('Error:', error);
    });
};

document.getElementById('settingsForm').addEventListener('submit', function(event) {
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

    const userData = {
        login: login,
        fullName: fullName,
        email: email
    };

    if (password && confirmPassword) {
        userData.password = password;
    }

    fetch('/update-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(userData)
    })
    .then(response => response.text())
    .then(data => {
        const messageType = data === 'User updated successfully.' ? 'success' : 'error';
        showMessage(data, messageType);

        if (messageType === 'success') {
            setTimeout(function() {
                window.location.href = '/profile';
            }, 1000);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        showMessage('An error occurred.', 'error');
    });
});

document.getElementById('deleteAccount').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('confirmModal').style.display = 'block';
});

document.getElementById('confirmDelete').addEventListener('click', function() {
    fetch('/delete-account', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ login: oldLogin })
    })
    .then(response => response.text())
    .then(data => {
        showMessage(data, 'success');
        setTimeout(function() {
            window.location.href = '/register';
        }, 1200);
    })
    .catch((error) => {
        console.error('Error:', error);
        showMessage('An error occurred.', 'error');
    });

    document.getElementById('confirmModal').style.display = 'none';
});

document.getElementById('cancelDelete').addEventListener('click', function() {
    document.getElementById('confirmModal').style.display = 'none';
});

function showMessage(message, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.className = type;
}