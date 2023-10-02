const socket = io('http://localhost:3000');

const urlParams = new URLSearchParams(window.location.search);
const player1Id = urlParams.get('player1Id');
const player2Id = urlParams.get('player2Id');
let curId = urlParams.get('curId');
const roomName = `game-${player1Id}-${player2Id}`;
const isCurIdPlayerOne = Number(curId) === Number(player1Id) ? true : false;
let curPlayer;
let isMyTurn;
let gameHandlers = [];
let handlersStart = [];

document.getElementById('surrender').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('confirmModal').style.display = 'block';
});

document.getElementById('cancelSurrender').addEventListener('click', function() {
    document.getElementById('confirmModal').style.display = 'none';
});

socket.emit('upd-socket-gamepage', { userId: curId});

socket.emit('get-game-state', { roomName });

socket.on('game-update', (gameState) => {
    document.getElementById('room-name').textContent = gameState.players[0].login + ' vs ' + gameState.players[1].login;

    document.getElementById('player1-login').textContent = gameState.players[0].login;
    document.getElementById('player1-energy').textContent = 'Energy: ' + gameState.players[0].energy;
    document.getElementById('player1-hp').textContent = 'Hp: ' + gameState.players[0].hp;

    document.getElementById('player2-login').textContent = gameState.players[1].login;
    document.getElementById('player2-energy').textContent = 'Energy: ' + gameState.players[1].energy;
    document.getElementById('player2-hp').textContent = 'Hp: ' + gameState.players[1].hp;

    isMyTurn = Number(gameState.currentPlayerMove) === Number(curId);
    document.getElementById('turn-indicator').textContent = isMyTurn ? 'Your move' : 'Enemy\'s move';

    for (let i = 0; i < 3; i++) {
        let enemyCard;
        let ownCard;
        if (isCurIdPlayerOne) {
            ownCard = gameState.players[0].heroes[i];
            enemyCard = gameState.players[1].heroes[i];
        } else {
            enemyCard = gameState.players[0].heroes[i];
            ownCard = gameState.players[1].heroes[i];
        }

        document.getElementById(`enemy-card-${i+1}-img`).src = enemyCard.img;
        document.getElementById(`enemy-card-${i+1}-name`).textContent = enemyCard.name;
        document.getElementById(`enemy-card-${i+1}-ability`).textContent = enemyCard.ability;
        document.getElementById(`enemy-card-${i+1}-atk`).innerHTML = enemyCard.attack + '<br>ATK';
        document.getElementById(`enemy-card-${i+1}-def`).innerHTML = enemyCard.defense + '<br>DEF';
        document.getElementById(`enemy-card-${i+1}-heal`).innerHTML = enemyCard.heal + '<br>HEAL';

        document.getElementById(`own-card-${i+1}-img`).src = ownCard.img;
        document.getElementById(`own-card-${i+1}-name`).textContent = ownCard.name;
        document.getElementById(`own-card-${i+1}-ability`).textContent = ownCard.ability;
        document.getElementById(`own-card-${i+1}-atk`).innerHTML = ownCard.attack + '<br>ATK';
        document.getElementById(`own-card-${i+1}-def`).innerHTML = ownCard.defense + '<br>DEF';
        document.getElementById(`own-card-${i+1}-heal`).innerHTML = ownCard.heal + '<br>HEAL';
    }

    curPlayer = isCurIdPlayerOne ? gameState.players[0] : gameState.players[1];
    if (!curPlayer.selectedCard) {
        document.getElementById('info-text-field').textContent = 'Pick your first card.';

        for (let i = 1; i <= 3; i++) {
            const button = document.getElementById(`option${i}`);

            const handleClick = function() {
                document.getElementById(`own-card-${i}`).style.transform = 'translateY(-4vh)';
                document.getElementById(`option${i}`).classList.add('choseBtn');

                socket.emit('first-card-selected', { cardIndex: i - 1, roomName, isCurIdPlayerOne });

                for (let j = 1; j <= 3; j++) {
                    document.getElementById(`option${j}`).removeEventListener('click', handlersStart[j-1]);
                }
                handlersStart = [];
            };

            handlersStart.push(handleClick);
            button.addEventListener('click', handleClick);
        }
    } else {
        socket.emit('page-reloaded', { roomName });
    }
});

socket.on('page-upd', (gameState) => {
    const player0SelectedCardIndex = gameState.players[0].heroes.findIndex(hero => hero.id === gameState.players[0].selectedCard.id);
    const player1SelectedCardIndex = gameState.players[1].heroes.findIndex(hero => hero.id === gameState.players[1].selectedCard.id);

    if (isCurIdPlayerOne) {
        if (gameState.players[0].selectedCard) {
            document.getElementById(`own-card-${player0SelectedCardIndex + 1}`).style.transform = 'translateY(-4vh)';
            document.getElementById(`option${player0SelectedCardIndex + 1}`).classList.add('choseBtn');
            if (gameState.players[0].ability) {
                document.getElementById('active-ability').textContent = gameState.players[0].ability;
                document.getElementById('ability-div').style.display = 'block';
            }
        }
        if (gameState.players[1].selectedCard) {
            document.getElementById(`enemy-card-${player1SelectedCardIndex + 1}`).style.transform = 'translateY(4vh)';
        }
    }
    else {
        if (gameState.players[0].selectedCard) {
            document.getElementById(`enemy-card-${player0SelectedCardIndex + 1}`).style.transform = 'translateY(4vh)';
        }
        if (gameState.players[1].selectedCard) {
            document.getElementById(`own-card-${player1SelectedCardIndex + 1}`).style.transform = 'translateY(-4vh)';
            document.getElementById(`option${player1SelectedCardIndex + 1}`).classList.add('choseBtn');
            if (gameState.players[1].ability) {
                document.getElementById('active-ability').textContent = gameState.players[1].ability;
                document.getElementById('ability-div').style.display = 'block';
            }
        }
    }

    socket.emit('listener-reload', roomName);
});

socket.on('opponent-card-selected', (data) => {
    document.getElementById(`enemy-card-${data.cardIndex+1}`).style.transform = 'translateY(4vh)';
});

socket.on('game-start', (gameState) => {
    curPlayer = isCurIdPlayerOne ? gameState.players[0] : gameState.players[1];
    isMyTurn = Number(gameState.currentPlayerMove) === Number(curId);

    for (let i = 1; i <= 3; i++) {
        const button = document.getElementById(`option${i}`);

        const handleClick = function() {
            const oldCardIndex = curPlayer.heroes.findIndex(hero => hero.id === curPlayer.selectedCard.id);

            if (oldCardIndex === i - 1)
                return;
            if (curPlayer.energy < 1)
                return;
            if (!isMyTurn)
                return;

            socket.emit('card-changed', { oldCardIndex: oldCardIndex, newCardIndex: i - 1, roomName, isCurIdPlayerOne });
        };

        gameHandlers.push(handleClick);
        button.addEventListener('click', handleClick);
    }

    const abilityButton = document.getElementById('ability');
    const handleAbilityClick = function() {
        if (curPlayer.energy < 2)
            return;
        if (!isMyTurn)
            return;
        if (curPlayer.selectedCard.abilityUsed)
            return;
        if (curPlayer.selectedCard.ability === '-')
            return;

        socket.emit('ability-used', { selectedCard: curPlayer.selectedCard, roomName, isCurIdPlayerOne });
    };
    gameHandlers.push(handleAbilityClick);
    abilityButton.addEventListener('click', handleAbilityClick);

    const attackButton = document.getElementById('attack');
    const handleAttackClick = function() {
        if (curPlayer.energy < 3)
            return;
        if (!isMyTurn)
            return;

        socket.emit('attack-used', { selectedCard: curPlayer.selectedCard, roomName, isCurIdPlayerOne });
    };
    gameHandlers.push(handleAttackClick);
    attackButton.addEventListener('click', handleAttackClick);

    const nextRoundButton = document.getElementById('next-round');
    const handleNextRoundClick = function() {
        socket.emit('next-round-clicked', { roomName, isCurIdPlayerOne });
    };
    gameHandlers.push(handleNextRoundClick);
    nextRoundButton.addEventListener('click', handleNextRoundClick);

    const surrenderButton = document.getElementById('confirmSurrender');
    const handleSurrenderClick = function() {
        socket.emit('surrender-clicked', { roomName, isCurIdPlayerOne });
        document.getElementById('confirmModal').style.display = 'none';
    };
    gameHandlers.push(handleSurrenderClick);
    surrenderButton.addEventListener('click', handleSurrenderClick);
});

function removeEventListeners() {
    for (let j = 1; j <= 3; j++) {
        document.getElementById(`option${j}`).removeEventListener('click', gameHandlers[j-1]);
    }
    document.getElementById('ability').removeEventListener('click', gameHandlers[3]);
    document.getElementById('attack').removeEventListener('click', gameHandlers[4]);
    document.getElementById('next-round').removeEventListener('click', gameHandlers[5]);
    document.getElementById('next-round').removeEventListener('click', gameHandlers[6]);
    gameHandlers = [];
}

socket.on('timer-expired', (data) => {
    for (let j = 1; j <= 3; j++) {
        document.getElementById(`option${j}`).removeEventListener('click', handlersStart[j-1]);
    }
    handlersStart = [];
    if (isCurIdPlayerOne) {
        console.log(data.gameState.players[0].selectedCard);
        if (JSON.stringify(data.gameState.players[0].selectedCard) === JSON.stringify(data.gameState.players[0].heroes[data.randCardInd1])) {
            document.getElementById(`own-card-${data.randCardInd1 + 1}`).style.transform = 'translateY(-4vh)';
            document.getElementById(`option${data.randCardInd1 + 1}`).classList.add('choseBtn');
        }
        if (JSON.stringify(data.gameState.players[1].selectedCard) === JSON.stringify(data.gameState.players[1].heroes[data.randCardInd2])) {
            document.getElementById(`enemy-card-${data.randCardInd2 + 1}`).style.transform = 'translateY(4vh)';
        }
    }
    else {
        console.log(data.gameState.players[1].selectedCard);
        if (JSON.stringify(data.gameState.players[0].selectedCard) === JSON.stringify(data.gameState.players[0].heroes[data.randCardInd1])) {
            document.getElementById(`enemy-card-${data.randCardInd1 + 1}`).style.transform = 'translateY(4vh)';
        }
        if (JSON.stringify(data.gameState.players[1].selectedCard) === JSON.stringify(data.gameState.players[1].heroes[data.randCardInd2])) {
            document.getElementById(`own-card-${data.randCardInd2 + 1}`).style.transform = 'translateY(-4vh)';
            document.getElementById(`option${data.randCardInd2 + 1}`).classList.add('choseBtn'); 
        }
    }
    socket.emit('listener-reload', roomName);
});

socket.on('timer-update', (timerDuration) => {
    const timerEl = document.getElementById('info-text-field');
    if (timerDuration === 0) {
        setTimeout(() => {
            timerEl.textContent = 'Game starts! Good luck!';
        }, 1500);
        setTimeout(() => {
            timerEl.textContent = '';
        }, 3000);
    } else {
        let sec = Math.ceil(timerDuration / 1000);
        timerEl.textContent = 'Pick your first card. You have ' + sec;
    }
});

socket.on('card-changed-success', (data) => {
    removeEventListeners();
    
    const oldCardIndex = curPlayer.heroes.findIndex(hero => hero.id === curPlayer.selectedCard.id);
    if (isCurIdPlayerOne)
        document.getElementById('player1-energy').textContent = 'Energy: ' + data.gameState.players[0].energy;
    else
        document.getElementById('player2-energy').textContent = 'Energy: ' + data.gameState.players[1].energy;

    document.getElementById(`own-card-${oldCardIndex + 1}`).style.transform = 'translateY(0)';
    document.getElementById(`option${oldCardIndex + 1}`).classList.remove('choseBtn');
    document.getElementById(`own-card-${data.newCardInd + 1}`).style.transform = 'translateY(-4vh)';
    document.getElementById(`option${data.newCardInd + 1}`).classList.add('choseBtn');
    isMyTurn = Number(data.gameState.currentPlayerMove) === Number(curId);
    document.getElementById('turn-indicator').textContent = isMyTurn ? 'Your move' : 'Enemy\'s move';

    socket.emit('listener-reload', roomName);
});

socket.on('opponent-card-changed', (data) => {
    removeEventListeners();

    if (isCurIdPlayerOne)
        document.getElementById('player2-energy').textContent = 'Energy: ' + data.gameState.players[1].energy;
    else
        document.getElementById('player1-energy').textContent = 'Energy: ' + data.gameState.players[0].energy;

    document.getElementById(`enemy-card-${data.oldCardInd + 1}`).style.transform = 'translateY(0)';
    document.getElementById(`enemy-card-${data.newCardInd + 1}`).style.transform = 'translateY(4vh)';
    isMyTurn = Number(data.gameState.currentPlayerMove) === Number(curId);
    document.getElementById('turn-indicator').textContent = isMyTurn ? 'Your move' : 'Enemy\'s move';

    socket.emit('listener-reload', roomName);
});

socket.on('ability-used-success', (data) => {
    removeEventListeners();

    if (isCurIdPlayerOne) {
        document.getElementById('player1-energy').textContent = 'Energy: ' + data.gameState.players[0].energy;
        document.getElementById('info-text-field').textContent = `${data.gameState.players[0].login} activated abilty!`;
        document.getElementById('active-ability').textContent = data.gameState.players[0].ability;
    }
    else {
        document.getElementById('player2-energy').textContent = 'Energy: ' + data.gameState.players[1].energy;
        document.getElementById('info-text-field').textContent = `${data.gameState.players[1].login} activated abilty!`;
        document.getElementById('active-ability').textContent = data.gameState.players[1].ability;
    }

    document.getElementById('ability-div').style.display = 'block';

    setTimeout(() => {
        document.getElementById('info-text-field').textContent = '';
    }, 1500);
    socket.emit('listener-reload', roomName);
});

socket.on('opponent-ability-used', (data) => {
    removeEventListeners();

    if (isCurIdPlayerOne) {
        document.getElementById('player2-energy').textContent = 'Energy: ' + data.gameState.players[1].energy;
        document.getElementById('info-text-field').textContent = `${data.gameState.players[1].login} activated abilty!`;
    }
    else {
        document.getElementById('player1-energy').textContent = 'Energy: ' + data.gameState.players[0].energy;
        document.getElementById('info-text-field').textContent = `${data.gameState.players[0].login} activated abilty!`;
    }

    setTimeout(() => {
        document.getElementById('info-text-field').textContent = '';
    }, 1500);
    socket.emit('listener-reload', roomName);
});

socket.on('attack-used-success', (data) => {
    removeEventListeners();
    
    let enemyInd = 0;

    if (isCurIdPlayerOne) {
        document.getElementById('player1-energy').textContent = 'Energy: ' + data.gameState.players[0].energy;
        document.getElementById('player2-hp').textContent = 'Hp: ' + data.gameState.players[1].hp;
        document.getElementById('info-text-field').textContent = `${data.gameState.players[0].login} deals ${data.attack} damage!`;
         if (!data.gameState.players[0].ability) {
            document.getElementById('ability-div').style.display = 'none';
            document.getElementById('active-ability').textContent = '';
        }
        enemyInd = 1;
    }
    else {
        document.getElementById('player2-energy').textContent = 'Energy: ' + data.gameState.players[1].energy;
        document.getElementById('player1-hp').textContent = 'Hp: ' + data.gameState.players[0].hp;
        document.getElementById('info-text-field').textContent = `${data.gameState.players[1].login} deals ${data.attack} damage!`;
        if (!data.gameState.players[1].ability) {
            document.getElementById('ability-div').style.display = 'none';
            document.getElementById('active-ability').textContent = '';
        }
        enemyInd = 0;
    }

    if (data.gameState.players[enemyInd].hp === 0) {
        setTimeout(() => {
            document.getElementById('info-text-field').textContent = 'You win! Congratulations!';
            document.getElementById(`player${enemyInd+1}-avatar`).src = `broke${enemyInd+1}.png`;
            document.getElementById(`player${enemyInd+1}-avatar`).alt = `Broke player ${enemyInd+1} avatar`;
        }, 1500);
        setTimeout(() => {
            window.location.href = '/profile';
        }, 3000);
    } else {
        isMyTurn = Number(data.gameState.currentPlayerMove) === Number(curId);
        document.getElementById('turn-indicator').textContent = isMyTurn ? 'Your move' : 'Enemy\'s move';
        setTimeout(() => {
            document.getElementById('info-text-field').textContent = '';
        }, 1500);
        socket.emit('listener-reload', roomName);
    }
});

socket.on('opponent-attack-used', (data) => {
    removeEventListeners();

    let ownInd = 0;

    if (isCurIdPlayerOne) {
        document.getElementById('player2-energy').textContent = 'Energy: ' + data.gameState.players[1].energy;
        document.getElementById('player1-hp').textContent = 'Hp: ' + data.gameState.players[0].hp;
        document.getElementById('info-text-field').textContent = `${data.gameState.players[1].login} deals ${data.attack} damage!`;
        if (!data.gameState.players[1].ability) {
            document.getElementById('ability-div').style.display = 'none';
            document.getElementById('active-ability').textContent = '';
        }
        ownInd = 0;
    }
    else {
        document.getElementById('player1-energy').textContent = 'Energy: ' + data.gameState.players[0].energy;
        document.getElementById('player2-hp').textContent = 'Hp: ' + data.gameState.players[1].hp;
        document.getElementById('info-text-field').textContent = `${data.gameState.players[0].login} deals ${data.attack} damage!`;
        if (!data.gameState.players[0].ability) {
            document.getElementById('ability-div').style.display = 'none';
            document.getElementById('active-ability').textContent = '';
        }
        ownInd = 1;
    }

    if (data.gameState.players[ownInd].hp === 0) {
        setTimeout(() => {
            document.getElementById('info-text-field').textContent = 'You lose!';
            document.getElementById(`player${ownInd+1}-avatar`).src = `broke${ownInd+1}.png`;
            document.getElementById(`player${ownInd+1}-avatar`).alt = `Broke player ${ownInd+1} avatar`;
        }, 1500);
        setTimeout(() => {
            window.location.href = '/profile';
        }, 3000);
    } else {
        isMyTurn = Number(data.gameState.currentPlayerMove) === Number(curId);
        document.getElementById('turn-indicator').textContent = isMyTurn ? 'Your move' : 'Enemy\'s move';
        setTimeout(() => {
            document.getElementById('info-text-field').textContent = '';
        }, 1500);
        socket.emit('listener-reload', roomName);
    }
});

socket.on('next-round-success', (data) => {
    removeEventListeners();

    document.getElementById('player1-energy').textContent = 'Energy: ' + data.gameState.players[0].energy;
    document.getElementById('player1-hp').textContent = 'Hp: ' + data.gameState.players[0].hp;

    document.getElementById('player2-energy').textContent = 'Energy: ' + data.gameState.players[1].energy;
    document.getElementById('player2-hp').textContent = 'Hp: ' + data.gameState.players[1].hp;

    isMyTurn = Number(data.gameState.currentPlayerMove) === Number(curId);
    document.getElementById('turn-indicator').textContent = isMyTurn ? 'Your move' : 'Enemy\'s move';

    if (isCurIdPlayerOne && !data.gameState.players[0].ability) {
        document.getElementById('active-ability').textContent = '';
        document.getElementById('ability-div').style.display = 'none';
    }
    else if (!isCurIdPlayerOne && !data.gameState.players[1].ability) {
        document.getElementById('active-ability').textContent = '';
        document.getElementById('ability-div').style.display = 'none';
    }

    for (let i = 0; i < 3; i++) {
        let enemyCard;
        let ownCard;
        if (isCurIdPlayerOne) {
            ownCard = data.gameState.players[0].heroes[i];
            enemyCard = data.gameState.players[1].heroes[i];
        } else {
            enemyCard = data.gameState.players[0].heroes[i];
            ownCard = data.gameState.players[1].heroes[i];
        }

        document.getElementById(`enemy-card-${i+1}-img`).src = enemyCard.img;
        document.getElementById(`enemy-card-${i+1}-name`).textContent = enemyCard.name;
        document.getElementById(`enemy-card-${i+1}-ability`).textContent = enemyCard.ability;
        document.getElementById(`enemy-card-${i+1}-atk`).innerHTML = enemyCard.attack + '<br>ATK';
        document.getElementById(`enemy-card-${i+1}-def`).innerHTML = enemyCard.defense + '<br>DEF';
        document.getElementById(`enemy-card-${i+1}-heal`).innerHTML = enemyCard.heal + '<br>HEAL';

        document.getElementById(`own-card-${i+1}-img`).src = ownCard.img;
        document.getElementById(`own-card-${i+1}-name`).textContent = ownCard.name;
        document.getElementById(`own-card-${i+1}-ability`).textContent = ownCard.ability;
        document.getElementById(`own-card-${i+1}-atk`).innerHTML = ownCard.attack + '<br>ATK';
        document.getElementById(`own-card-${i+1}-def`).innerHTML = ownCard.defense + '<br>DEF';
        document.getElementById(`own-card-${i+1}-heal`).innerHTML = ownCard.heal + '<br>HEAL';
    }

    document.getElementById('info-text-field').textContent = `${data.login} voted to start the next round.`;
    setTimeout(() => {
        document.getElementById('info-text-field').textContent = `Next round starts!`;
        setTimeout(() => {
            document.getElementById('info-text-field').textContent = '';
        }, 1000);
    }, 1500);
    socket.emit('listener-reload', roomName);
});

socket.on('next-round-pressed-success', (data) => {
    removeEventListeners();

    document.getElementById('info-text-field').textContent = `${data.login} voted to start the next round.`;
    isMyTurn = Number(data.gameState.currentPlayerMove) === Number(curId);
    document.getElementById('turn-indicator').textContent = isMyTurn ? 'Your move' : 'Enemy\'s move';

    setTimeout(() => {
        document.getElementById('info-text-field').textContent = '';
    }, 1000);
    socket.emit('listener-reload', roomName);
});

socket.on('surrender-clicked-success', (gameState) => {
    removeEventListeners();
    
    let ownInd = 0;

    if (isCurIdPlayerOne) {
        document.getElementById('info-text-field').textContent = `${gameState.players[0].login} has chosen the path of the weak.`;
        ownInd = 0;
    }
    else {
        document.getElementById('info-text-field').textContent = `${gameState.players[1].login} has chosen the path of the weak.`;
        ownInd = 1;
    }

    document.getElementById(`player${ownInd+1}-avatar`).src = `broke${ownInd+1}.png`;
    document.getElementById(`player${ownInd+1}-avatar`).alt = `Broke player ${ownInd+1} avatar`;

    setTimeout(() => {
        window.location.href = '/profile';
    }, 3000);
});

socket.on('opponent-surrender-clicked-success', (gameState) => {
    removeEventListeners();

    let enemyInd = 0;

    if (isCurIdPlayerOne) {
        document.getElementById('info-text-field').textContent = `${gameState.players[1].login} has chosen the path of the weak.`;
        enemyInd = 1;
    }
    else {
        document.getElementById('info-text-field').textContent = `${gameState.players[0].login} has chosen the path of the weak.`;
        enemyInd = 0;
    }

    document.getElementById(`player${enemyInd+1}-avatar`).src = `broke${enemyInd+1}.png`;
    document.getElementById(`player${enemyInd+1}-avatar`).alt = `Broke player ${enemyInd+1} avatar`;

    setTimeout(() => {
        window.location.href = '/profile';
    }, 3000);
});

socket.on('global-timer-update', (timerDuration) => {
    const timerEl = document.getElementById('timer');
    if (timerDuration === 0) {
        timerEl.textContent = '0:00 min';
    } else {
        let sec = Math.ceil(timerDuration / 1000);
        if (sec < 10) {
            timerEl.textContent = '0:0' + sec + ' min';
        } else {
            timerEl.textContent = '0:' + sec + ' min';
        }
    }
});

socket.on('time-left', (gameState) => {
    removeEventListeners();
    
    let ownInd = 0;

    if (isCurIdPlayerOne) {
        document.getElementById('info-text-field').textContent = `Player ${gameState.players[0].login} is out of time.`;
        ownInd = 0;
    }
    else {
        document.getElementById('info-text-field').textContent = `Player ${gameState.players[1].login} is out of time.`;
        ownInd = 1;
    }

    document.getElementById(`player${ownInd+1}-avatar`).src = `broke${ownInd+1}.png`;
    document.getElementById(`player${ownInd+1}-avatar`).alt = `Broke player ${ownInd+1} avatar`;
    
    setTimeout(() => {
        document.getElementById('info-text-field').textContent = 'You lose!';
    }, 1500);
    setTimeout(() => {
        window.location.href = '/profile';
    }, 3000);
});

socket.on('opponent-time-left', (gameState) => {
    removeEventListeners();

    let enemyInd = 0;

    if (isCurIdPlayerOne) {
        document.getElementById('info-text-field').textContent = `Player ${gameState.players[1].login} is out of time.`;
        enemyInd = 1;
    }
    else {
        document.getElementById('info-text-field').textContent = `Player ${gameState.players[0].login} is out of time.`;
        enemyInd = 0;
    }

    document.getElementById(`player${enemyInd+1}-avatar`).src = `broke${enemyInd+1}.png`;
    document.getElementById(`player${enemyInd+1}-avatar`).alt = `Broke player ${enemyInd+1} avatar`;

    setTimeout(() => {
        document.getElementById('info-text-field').textContent = 'You win! Congratulations!';
    }, 1500);
    setTimeout(() => {
        window.location.href = '/profile';
    }, 3000);
});