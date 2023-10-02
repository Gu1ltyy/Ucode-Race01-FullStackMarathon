let sessionId = 0;

window.onload = function() {
    fetch('/get-status', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('login').textContent = data.login;
        document.getElementById('totalGames').textContent = data.wins + data.losses;
        document.getElementById('wins').textContent = data.wins;
        document.getElementById('losses').textContent = data.losses;
        sessionId = data.id;
        if (data.inGame || data.isWaiting) {
            document.getElementById('inGame').innerHTML = 'You are currently in the queue or game.<br>Unfortunately it is not possible to start a new game or access the settings during the game.';
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        showMessage('An error occurred.', 'error');
    });
};

document.getElementById('rules').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('confirmModal').style.display = 'block';
});

window.addEventListener('beforeunload', function (event) {
    setTimeout(() => {
        socket.emit('disconnect');
    }, 3500);
});

document.getElementById('goBack').addEventListener('click', function() {
    document.getElementById('confirmModal').style.display = 'none';
});

const socket = io('http://localhost:3000');

document.getElementById('start').addEventListener('click', () => {
    socket.emit('start-game');
});

setInterval(() => {
    socket.emit('ping');
}, 1000);

socket.on('start-game', (data) => {
    showMessage(`Enemy finded! ${data.player1.login} vs ${data.player2.login}. Be ready!`, 'success');
    setTimeout(() => {
        window.location.href = '/game?player1Id=' + data.player1.id + '&player2Id=' + data.player2.id + '&curId=' + sessionId;
    }, 3000);
});

socket.on('error', (message) => {
    showMessage(message, 'error');
});

socket.on('success', (message) => {
    showMessage(message, 'success');
    document.getElementById('inGame').innerHTML = 'You are currently in the queue or game.<br>Unfortunately it is not possible to start a new game or access the settings during the game.';
});

function showMessage(message, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.className = type;
}
