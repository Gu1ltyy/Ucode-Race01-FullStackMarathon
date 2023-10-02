const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db.js');
const User = require('./models/user.js');
const path = require('path');
const nodemailer = require('nodemailer');
const socketIo = require('socket.io');
const session = require('express-session');
const sharedsession = require("express-socket.io-session");

const app = express();
const http = require('http');
const server = http.createServer(app);
const io = socketIo(server);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public/pictures')));

const sessionMiddleware = session({ 
    secret: 'key', 
    resave: false, 
    saveUninitialized: false 
});

app.use(sessionMiddleware);

io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
});

let waitingPlayers = [];
let inGame = {};
let openTabs = {};
let lastPing = {};
let sockets = {};
let intervals = {};
let gameStates = {};
let timersGame = {};

const allHeroes = [
    {
        id: 'hero1',
        attack: 3,
        defense: 2,
        heal: 1,
        ability: "ATK +2",
        img: '1.png',
        name: 'Iron man',
    },
    {
        id: 'hero2',
        attack: 3,
        defense: 2,
        heal: 0,
        ability: "DEF +3",
        img: '2.png',
        name: 'Batman',
    },
    {
        id: 'hero3',
        attack: 5,
        defense: 0,
        heal: 0,
        ability: "ATK +2",
        img: '3.png',
        name: 'Hulk',
    },
    {
        id: 'hero4',
        attack: 2,
        defense: 4,
        heal: 1,
        ability: "DEF +4",
        img: '4.png',
        name: 'Captain America',
    },
    {
        id: 'hero5',
        attack: 4,
        defense: 1,
        heal: 1,
        ability: "HEAL +2",
        img: '5.png',
        name: 'Daken',
    },
    {
        id: 'hero6',
        attack: 5,
        defense: 1,
        heal: 0,
        ability: "ATK +3",
        img: '6.png',
        name: 'Thor',
    },
    {
        id: 'hero7',
        attack: 2,
        defense: 1,
        heal: 0,
        ability: "50% for 0 DMG",
        img: '7.png',
        name: 'Spider Man',
    },
    {
        id: 'hero8',
        attack: 3,
        defense: 0,
        heal: 0,
        ability: "HEAL +2",
        img: '8.png',
        name: 'Captain Marvel',
    },
    {
        id: 'hero9',
        attack: 4,
        defense: 1,
        heal: 0,
        ability: "DEF +5",
        img: '9.png',
        name: 'Ant Man',
    },
    {
        id: 'hero10',
        attack: 1,
        defense: 4,
        heal: 0,
        ability: "DEF +3",
        img: '10.png',
        name: 'Cannonball',
    },
    {
        id: 'hero11',
        attack: 1,
        defense: 2,
        heal: 2,
        ability: "HEAL +3",
        img: '11.png',
        name: 'Vostok',
    },
    {
        id: 'hero12',
        attack: 1,
        defense: 0,
        heal: 0,
        ability: "ATK +2",
        img: '12.png',
        name: 'Mr. Zodiac',
    },
    {
        id: 'hero13',
        attack: 2,
        defense: 4,
        heal: 3,
        ability: "-",
        img: '13.png',
        name: 'Invicible',
    },
    {
        id: 'hero14',
        attack: 3,
        defense: 3,
        heal: 0,
        ability: "50% for ATK +6",
        img: '14.png',
        name: 'Black Panther',
    },
    {
        id: 'hero15',
        attack: 4,
        defense: 2,
        heal: 1,
        ability: "ATK +3 DEF -2",
        img: '15.png',
        name: 'Rocket Racer',
    },
    {
        id: 'hero16',
        attack: 3,
        defense: 3,
        heal: 3,
        ability: "-",
        img: '16.png',
        name: 'Shriek',
    },
    {
        id: 'hero17',
        attack: 1,
        defense: 1,
        heal: 1,
        ability: "ATK +6",
        img: '17.png',
        name: 'Black Cat',
    },
    {
        id: 'hero18',
        attack: 2,
        defense: 4,
        heal: 2,
        ability: "DEF +1",
        img: '18.png',
        name: 'Vision',
    },
    {
        id: 'hero19',
        attack: 8,
        defense: 0,
        heal: 0,
        ability: "-",
        img: '19.png',
        name: 'Sentry',
    },
    {
        id: 'hero20',
        attack: 2,
        defense: 6,
        heal: 1,
        ability: "ATK +3 DEF -5",
        img: '20.png',
        name: 'Blue Beetle',
    },
];

function getRandomHeroes(heroes) {
    let remainingHeroes = [...heroes];
    const playerHeroes = [];
    for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * remainingHeroes.length);
        const hero = remainingHeroes.splice(randomIndex, 1)[0];
        playerHeroes.push({ ...hero, uses: 0 });
    }
    return { playerHeroes, remainingHeroes };
}

io.on('connection', (socket) => {
    const req = socket.request;
    socket.req = req;
    if (req.session.user) {
        const userId = req.session.user.id;
        if (openTabs[userId])
            openTabs[userId]++;
        else
            openTabs[userId] = 1;

        socket.on('start-game', async () => {
            const isWaiting = waitingPlayers.some(player => player.id === req.session.user.id);
            if (!isWaiting && !inGame[userId]) {
                socket.emit('success', 'Joined the queue. Wait please.');
                const player = req.session.user;
                waitingPlayers.push(player);
                sockets[userId] = socket;
                const curUserId = userId;

                lastPing[userId] = Date.now();

                socket.on('disconnect', () => {
                    openTabs[curUserId]--;
                });

                if (intervals[userId]) {
                    clearInterval(intervals[userId]);
                }
    
                intervals[curUserId] = setInterval(() => {
                    if (Date.now() - lastPing[curUserId] > 1000 && openTabs[curUserId] <= 0) {
                        if (!inGame[curUserId]) {
                            delete inGame[curUserId];
                            delete sockets[curUserId];
                        }
                        waitingPlayers = waitingPlayers.filter(player => player.id !== curUserId);
                        clearInterval(intervals[curUserId]);
                        delete intervals[curUserId];
                    }
                }, 1000);

                socket.on('ping', () => {
                    lastPing[curUserId] = Date.now();
                });

                if (waitingPlayers.length >= 2) {
                    const player1 = waitingPlayers.shift();
                    const player2 = waitingPlayers.shift();

                    const roomName = `game-${player1.id}-${player2.id}`;

                    const { playerHeroes: player1Heroes, remainingHeroes: remainingHeroes1 } = getRandomHeroes(allHeroes);
                    const { playerHeroes: player2Heroes, remainingHeroes: remainingHeroes2 } = getRandomHeroes(remainingHeroes1);
                    gameStates[roomName] = {
                        players: [
                            { id: player1.id, login: player1.login, wins: player1.wins, losses: player1.losses, hp: 60, energy: 8, heroes: player1Heroes },
                            { id: player2.id, login: player2.login, wins: player2.wins, losses: player2.losses, hp: 60, energy: 8, heroes: player2Heroes }
                        ],
                        remainingHeroes: remainingHeroes2,
                        currentPlayerMove: Math.random() < 0.5 ? player1.id : player2.id
                    };

                    socket.join(roomName);
                    sockets[player1.id].join(roomName);
                    inGame[player1.id] = true;
                    inGame[player2.id] = true;
                    io.to(roomName).emit('start-game', { player1, player2 });
                    let timerDuration = 21000;

                    let timerInterval = setInterval(() => {
                        timerDuration -= 1000;
                        const gameState = gameStates[roomName];

                        if (gameState.players[0].selectedCard && gameState.players[1].selectedCard) {
                            sockets[player1.id].emit('timer-update', 0);
                            sockets[player2.id].emit('timer-update', 0);
                            clearInterval(timerInterval);
                        }
                        sockets[player1.id].emit('timer-update', timerDuration);
                        sockets[player2.id].emit('timer-update', timerDuration);
                        
                        if (timerDuration <= 0) {
                            let randCardInd1 = Math.floor(Math.random() * 3);
                            let randCardInd2 = Math.floor(Math.random() * 3);
                            if (!gameState.players[0].selectedCard) {
                                gameState.players[0].selectedCard = gameState.players[0].heroes[randCardInd1];
                            }
                            if (!gameState.players[1].selectedCard) {
                                gameState.players[1].selectedCard = gameState.players[1].heroes[randCardInd2];
                            }

                            timerUpd(roomName);

                            sockets[player1.id].emit('timer-expired', { gameState, randCardInd1, randCardInd2 });
                            sockets[player2.id].emit('timer-expired', { gameState, randCardInd1, randCardInd2 });
                            clearInterval(timerInterval);
                        }
                    }, 1000);
                }
            } else {
                socket.emit('error', 'You are already in a queue or game.');
            }
        });

        socket.on('upd-socket-gamepage', (data) => {
            sockets[data.userId] = socket;
        });

        socket.on('get-game-state', (data) => {
            const gameState = gameStates[data.roomName];
            socket.emit('game-update', gameState);
        });

        socket.on('page-reloaded', (data) => {
            const gameState = gameStates[data.roomName];
            socket.emit('page-upd', gameState);
        });

        function timerUpd(roomName) {
            if (!intervals[roomName]) {
                const gameState = gameStates[roomName];
                timersGame[roomName] = 60000;
                intervals[roomName] = setInterval(() => {
                    timersGame[roomName] -= 1000;

                    sockets[gameState.players[0].id].emit('global-timer-update', timersGame[roomName]);
                    sockets[gameState.players[1].id].emit('global-timer-update', timersGame[roomName]);
                    
                    if (timersGame[roomName] <= 0) {
                        let player = gameState.currentPlayerMove === gameState.players[0].id ? gameState.players[1] : gameState.players[0];
                        let enemyPlayer = gameState.currentPlayerMove === gameState.players[0].id ? gameState.players[0] : gameState.players[1];

                        player.wins += 1;
                        enemyPlayer.losses += 1;

                        sockets[player.id].emit('opponent-time-left', gameState);
                        sockets[enemyPlayer.id].emit('time-left', gameState);

                        db.updateWinsAndLosses('race01_user', player.login, player.wins, player.losses)
                        .then(() => db.updateWinsAndLosses('race01_user', enemyPlayer.login, enemyPlayer.wins, enemyPlayer.losses))
                        .catch(error => console.error(`Failed to update user: ${error.message}`));

                        delete sockets[player.id];
                        delete inGame[player.id];
                        delete lastPing[player.id];
                        delete openTabs[player.id];

                        delete sockets[enemyPlayer.id];
                        delete inGame[enemyPlayer.id];
                        delete lastPing[enemyPlayer.id];
                        delete openTabs[enemyPlayer.id];

                        delete gameStates[roomName];

                        clearInterval(intervals[roomName]);
                        delete intervals[roomName];
                        delete timersGame[roomName];
                    }
                }, 1000);
            }
        }

        socket.on('first-card-selected', (data) => {
            let gameState = gameStates[data.roomName];
            let player = data.isCurIdPlayerOne ? gameState.players[0] : gameState.players[1];
        
            player.selectedCard = player.heroes[data.cardIndex];
        
            const opponent = data.isCurIdPlayerOne ? sockets[gameState.players[1].id] : sockets[gameState.players[0].id];
            socket.to(opponent.id).emit('opponent-card-selected', { cardIndex: data.cardIndex });
            
            if (gameState.players[0].selectedCard && gameState.players[1].selectedCard) {
                socket.emit('game-start', gameState);
                socket.to(opponent.id).emit('game-start', gameState);
                timerUpd(data.roomName);
            }
        });
        
        socket.on('card-changed', (data) => {
            let gameState = gameStates[data.roomName];
            let player = data.isCurIdPlayerOne ? gameState.players[0] : gameState.players[1];
            let enemyPlayer = data.isCurIdPlayerOne ? gameState.players[1] : gameState.players[0];
        
            if (player.energy < 1)
                return; 
            if (gameState.currentPlayerMove !== player.id)
                return;
            if (player.selectedCard === player.heroes[data.newCardIndex])
                return;

            player.energy -= 1;
            player.selectedCard = player.heroes[data.newCardIndex];
            if (!enemyPlayer.nextRound)
                gameState.currentPlayerMove = data.isCurIdPlayerOne ? gameState.players[1].id : gameState.players[0].id;

            timersGame[data.roomName] = 60000;
        
            socket.emit('card-changed-success', {gameState: gameState, newCardInd: data.newCardIndex});
            const opponent = data.isCurIdPlayerOne ? sockets[gameState.players[1].id] : sockets[gameState.players[0].id];
            socket.to(opponent.id).emit('opponent-card-changed', { gameState: gameState, oldCardInd: data.oldCardIndex, newCardInd: data.newCardIndex, energy: player.energy });
        });

        socket.on('ability-used', (data) => {
            let gameState = gameStates[data.roomName];
            let player = data.isCurIdPlayerOne ? gameState.players[0] : gameState.players[1];
        
            if (player.energy < 2)
                return; 
            if (gameState.currentPlayerMove !== player.id)
                return;
            if (player.selectedCard.abilityUsed)
                return;
            if (player.selectedCard.ability === '-')
                return;

            player.energy -= 2;
            player.selectedCard.abilityUsed = true;
            player.ability = player.selectedCard.ability;
            player.selectedCard.uses += 1;

            timersGame[data.roomName] = 60000;
        
            socket.emit('ability-used-success', { gameState: gameState });
            const opponent = data.isCurIdPlayerOne ? sockets[gameState.players[1].id] : sockets[gameState.players[0].id];
            socket.to(opponent.id).emit('opponent-ability-used', { gameState: gameState });
        });

        function applyAbility(ability) {
            let attack = 0;
            let defense = 0;
            if (ability.includes("ATK +") && !ability.includes("50% for ATK +")) {
                const bonusAttack = parseInt(ability.split("+")[1]);
                attack += bonusAttack;
            }  if (ability.includes("DEF +")) {
                const bonusDefense = parseInt(ability.split("+")[1]);
                defense += bonusDefense;
            }  if (ability.includes("DEF -")) {
                const penaltyDefense = parseInt(ability.split("-")[1]);
                defense -= penaltyDefense;
            }
            if (ability.includes("50% for ATK +")) {
                if (Math.random() < 0.5) {
                    const bonusAttack = parseInt(ability.split("+")[1]);
                    attack += bonusAttack;
                }
            }
            return {atack: attack, defense: defense};
        }

        socket.on('attack-used', (data) => {
            let gameState = gameStates[data.roomName];
            let player = data.isCurIdPlayerOne ? gameState.players[0] : gameState.players[1];
            let enemyPlayer = data.isCurIdPlayerOne ? gameState.players[1] : gameState.players[0];
        
            if (player.energy < 3)
                return; 
            if (gameState.currentPlayerMove !== player.id)
                return;

            player.energy -= 3;
            player.selectedCard.uses += 1;
            if (!enemyPlayer.nextRound)
                gameState.currentPlayerMove = data.isCurIdPlayerOne ? gameState.players[1].id : gameState.players[0].id;

            let selfAtack = 0;
            let selfDef = 0;
            let enemyAtk = 0;
            let enemyDef = 0;

            if (player.ability) {
                let playerAb = applyAbility(player.ability);
                selfAtack = playerAb.atack;
                selfDef = playerAb.defense;
            }
            if (enemyPlayer.ability) {
                let enemyAb = applyAbility(enemyPlayer.ability);
                enemyAtk = enemyAb.atack;
                enemyDef =  enemyAb.defense;
            }            

            let attack = player.selectedCard.attack + selfAtack;
            let defense = enemyPlayer.selectedCard.defense + enemyDef;
            
            if (enemyPlayer.ability && enemyPlayer.ability.includes("50% for 0 DMG")) {
                if (Math.random() < 0.5) {
                    defense = player.selectedCard.attack + selfAtack;
                }
            }

            if (defense < 0) 
                defense = 0;

            if (defense >= attack)
                attack = 0;
            else 
                attack -= defense;
            enemyPlayer.hp -= attack;

            if (enemyPlayer.hp < 0)
                enemyPlayer.hp = 0;

            if (player.ability && player.ability.includes("ATK +") && !player.ability.includes("DEF -")) {
                delete player.ability;
                delete player.selectedCard.abilityUsed;
            }
            if (enemyPlayer.ability && enemyPlayer.ability.includes("DEF +")) {
                delete enemyPlayer.ability;
                delete enemyPlayer.selectedCard.abilityUsed;
            }

            timersGame[data.roomName] = 60000;

            socket.emit('attack-used-success', { gameState: gameState, attack: attack});
            const opponent = data.isCurIdPlayerOne ? sockets[gameState.players[1].id] : sockets[gameState.players[0].id];
            socket.to(opponent.id).emit('opponent-attack-used', { gameState: gameState, attack: attack });

            if (enemyPlayer.hp === 0) {
                player.wins += 1;
                enemyPlayer.losses += 1;

                db.updateWinsAndLosses('race01_user', player.login, player.wins, player.losses)
                .then(() => db.updateWinsAndLosses('race01_user', enemyPlayer.login, enemyPlayer.wins, enemyPlayer.losses))
                .catch(error => console.error(`Failed to update user: ${error.message}`));

                delete sockets[player.id];
                delete inGame[player.id];
                delete lastPing[player.id];
                delete openTabs[player.id];

                delete sockets[enemyPlayer.id];
                delete inGame[enemyPlayer.id];
                delete lastPing[enemyPlayer.id];
                delete openTabs[enemyPlayer.id];

                delete gameStates[data.roomName];

                clearInterval(intervals[data.roomName]);
                delete intervals[data.roomName];
                delete timersGame[data.roomName];
            }
        });

        socket.on('next-round-clicked', (data) => {
            let gameState = gameStates[data.roomName];
            let player = data.isCurIdPlayerOne ? gameState.players[0] : gameState.players[1];
            let enemyPlayer = data.isCurIdPlayerOne ? gameState.players[1] : gameState.players[0];

            if (!player.selectedCard)
                return;
            if (!enemyPlayer.selectedCard)
                return;
            if (player.nextRound)
                return;

            if (enemyPlayer.nextRound) {
                player.nextRound = 2;
            }
            else {
                player.nextRound = 1;
            }

            if (player.nextRound && enemyPlayer.nextRound) {
                if (player.nextRound === 1)
                    gameState.currentPlayerMove = data.isCurIdPlayerOne ? gameState.players[0].id : gameState.players[1].id;
                else
                    gameState.currentPlayerMove = data.isCurIdPlayerOne ? gameState.players[1].id : gameState.players[0].id;

                player.energy = 8;
                enemyPlayer.energy = 8;

                delete player.nextRound;
                delete enemyPlayer.nextRound;
                
                if (player.selectedCard.heal > 0)
                    player.hp += player.selectedCard.heal;
                if (enemyPlayer.selectedCard.heal > 0)
                    enemyPlayer.hp += enemyPlayer.selectedCard.heal;

                if (player.ability && player.ability.includes("HEAL +")) {
                    const abilityHeal = parseInt(player.ability.split("+")[1]);
                    player.hp += abilityHeal;
                    delete player.ability;
                }
                if (enemyPlayer.ability && enemyPlayer.ability.includes("HEAL +")) {
                    const abilityHeal = parseInt(enemyPlayer.ability.split("+")[1]);
                    enemyPlayer.hp += abilityHeal;
                    delete enemyPlayer.ability;
                }

                if (player.ability && player.ability.includes("DEF -")) {
                    delete player.ability;
                }
                if (enemyPlayer.ability && enemyPlayer.ability.includes("DEF -")) {
                    delete enemyPlayer.ability;
                }

                for (let i = 0; i < 3; i++) {
                    delete player.heroes[i].abilityUsed;
                    delete enemyPlayer.heroes[i].abilityUsed;
                }

                delete player.selectedCard.abilityUsed;
                delete enemyPlayer.selectedCard.abilityUsed;

                if (player.hp > 60)
                    player.hp = 60;
                if (enemyPlayer.hp > 60)
                    enemyPlayer.hp = 60;

                
                const curPlayerSelectedCardIndex = player.heroes.findIndex(hero => hero.id === player.selectedCard.id);
                const enemyPlayerSelectedCardIndex = enemyPlayer.heroes.findIndex(hero => hero.id === enemyPlayer.selectedCard.id);

                for (let i = 0; i < 3; i++) {
                    if (player.heroes[i].uses >= 3) {
                        const randomIndex = Math.floor(Math.random() * gameState.remainingHeroes.length);
                        const newHero = { ...gameState.remainingHeroes.splice(randomIndex, 1)[0], uses: 0 };

                        player.heroes[i] = newHero;

                        player.heroes[i].uses = 0;

                        const randomInsertIndex = Math.floor(Math.random() * gameState.remainingHeroes.length);
                        gameState.remainingHeroes.splice(randomInsertIndex, 0, player.heroes[i]);
                    }
                    if (enemyPlayer.heroes[i].uses >= 3) {
                        const randomIndex = Math.floor(Math.random() * gameState.remainingHeroes.length);
                        const newHero = { ...gameState.remainingHeroes.splice(randomIndex, 1)[0], uses: 0 };

                        enemyPlayer.heroes[i] = newHero;

                        enemyPlayer.heroes[i].uses = 0;

                        const randomInsertIndex = Math.floor(Math.random() * gameState.remainingHeroes.length);
                        gameState.remainingHeroes.splice(randomInsertIndex, 0, enemyPlayer.heroes[i]);
                    }
                }

                player.selectedCard = player.heroes[curPlayerSelectedCardIndex];
                enemyPlayer.selectedCard = enemyPlayer.heroes[enemyPlayerSelectedCardIndex];
                
                timersGame[data.roomName] = 60000;

                socket.emit('next-round-success', { login: player.login, gameState });
                const opponent = data.isCurIdPlayerOne ? sockets[gameState.players[1].id] : sockets[gameState.players[0].id];
                socket.to(opponent.id).emit('next-round-success', { login: player.login, gameState });
            } else {
                if (gameState.currentPlayerMove === player.id) {
                    gameState.currentPlayerMove = enemyPlayer.id;
                    timersGame[data.roomName] = 60000;
                }

                socket.emit('next-round-pressed-success', { login: player.login, gameState });
                const opponent = data.isCurIdPlayerOne ? sockets[gameState.players[1].id] : sockets[gameState.players[0].id];
                socket.to(opponent.id).emit('next-round-pressed-success', { login: player.login, gameState });
            }
        });

        socket.on('surrender-clicked', (data) => {
            let gameState = gameStates[data.roomName];
            let player = data.isCurIdPlayerOne ? gameState.players[0] : gameState.players[1];
            let enemyPlayer = data.isCurIdPlayerOne ? gameState.players[1] : gameState.players[0];

            if (!player.selectedCard)
                return;
            if (!enemyPlayer.selectedCard)
                return;

            socket.emit('surrender-clicked-success', gameState);
            const opponent = data.isCurIdPlayerOne ? sockets[gameState.players[1].id] : sockets[gameState.players[0].id];
            socket.to(opponent.id).emit('opponent-surrender-clicked-success', gameState);

            player.losses += 1;
            enemyPlayer.wins += 1;
            db.updateWinsAndLosses('race01_user', player.login, player.wins, player.losses)
            .then(() => db.updateWinsAndLosses('race01_user', enemyPlayer.login, enemyPlayer.wins, enemyPlayer.losses))
            .catch(error => console.error(`Failed to update user: ${error.message}`));

            delete sockets[player.id];
            delete inGame[player.id];
            delete lastPing[player.id];
            delete openTabs[player.id];

            delete sockets[enemyPlayer.id];
            delete inGame[enemyPlayer.id];
            delete lastPing[enemyPlayer.id];
            delete openTabs[enemyPlayer.id];

            delete gameStates[data.roomName];

            clearInterval(intervals[data.roomName]);
            delete intervals[data.roomName];
            delete timersGame[data.roomName];
        });

        socket.on('listener-reload', (roomName) => {
            let gameState = gameStates[roomName];
            socket.emit('game-start', gameState);
        });
    }
});

app.post('/register', async (req, res) => {
    try {
        const user = new User({
            ...req.body,
            wins: 0,
            losses: 0
        });
        await user.save();
        res.send('User created successfully.');
    } catch (error) {
        res.send(error.message);
    }
});

app.post('/login', async (req, res) => {
    try {
        const user = await User.login(req.body);
        if (user) {
            req.session.user = user;
            res.send('Login successful.');
        } else {
            res.send('Invalid login or password.');
        }
    } catch (error) {
        res.send(error.message);
    }
});

app.post('/password-reminder', async (req, res) => {
    try {
        const user = await User.findUser(req.body);
        if (user) {
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'email@gmail.com', //TYPE YOUR REAL EMAIL AND PASSWORD before starting server
                    pass: 'pass'
                }
            });

            let mailOptions = {
                from: 'email@gmail.com', //TYPE YOUR REAL EMAIL before starting server
                to: user.email,
                subject: 'Password Reminder',
                text: `Your password is ${user.password}`
            };

            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                    console.log(error);
                    res.send('An error occurred.');
                } else {
                    console.log('Email sent: ' + info.response);
                    res.send('Password sent to your email.');
                }
            });
        } else {
            res.send('User not found.');
        }
    } catch (error) {
        res.send(error.message);
    }
});

app.get('/get-status', async (req, res) => {
    const isWaiting = waitingPlayers.some(player => player.id === req.session.user.id);
    const user = await User.findUser({ login: req.session.user.login} );
    req.session.user = user;

    res.json({ 
        id: req.session.user.id,
        login: req.session.user.login,
        wins: req.session.user.wins,
        losses: req.session.user.losses,
        inGame: inGame[req.session.user.id] ? true : false,
        isWaiting: isWaiting
    });
});

app.post('/update-user', async (req, res) => {
    if (req.session.user) {
        const user = new User({
            ...req.body,
            wins: req.session.user.wins,
            losses: req.session.user.losses
        });
        try {
            await user.update(req.session.user.login, req.session.user.email);
            req.session.user = user.data;
            res.send('User updated successfully.');
        } catch (error) {
            res.send(error.message);
        }
    } else {
        res.status(404).send('User not found.');
    }
});

app.get('/get-user-data', (req, res) => {
    if (req.session.user) {
        res.json({
            login: req.session.user.login,
            fullName: req.session.user.full_name,
            email: req.session.user.email
        });
    } else {
        res.status(404).send('User not found.');
    }
});

app.post('/delete-account', async (req, res) => {
    if (req.session.user) {
        const user = new User(req.session.user);
        try {
            await user.delete();
            req.session.destroy();
            res.send('Account deleted successfully.');
        } catch (error) {
            res.send(error.message);
        }
    } else {
        res.status(404).send('User not found.');
    }
});

app.get('/logout', (req, res) => {
    if (waitingPlayers.some(player => player.id === req.session.user.id)) { 
        if (!inGame[req.session.user.id]) {
            delete inGame[req.session.user.id];
            delete sockets[req.session.user.id];
        }
        waitingPlayers = waitingPlayers.filter(player => player.id !== req.session.user.id);
        openTabs[req.session.user.id] = 0;
    }
    req.session.destroy();
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    if (req.session && req.session.user) {
        res.redirect('/profile');
    } else {
        res.sendFile(path.join(__dirname, 'views', 'login.html'));
    }
});

app.get('/login.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'controllers','login.js'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/register.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'controllers', 'register.js'));
});

app.get('/reminder', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'passReminder.html'));
});

app.get('/reminder.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'controllers', 'reminder.js'));
});

app.get('/profile', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'views', 'profile.html'));
    } else {
        res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
    }
});

app.get('/profile.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'controllers', 'profile.js'));
});

app.get('/settings', (req, res) => {
    if (req.session.user) {
        const isWaiting = waitingPlayers.some(player => player.id === req.session.user.id);

        if (!inGame[req.session.user.id] && !isWaiting) {
            res.sendFile(path.join(__dirname, 'views', 'settings.html'));
        } else {
            res.redirect('/profile');
        }
    } else {
        res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
    }
});

app.get('/settings.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'controllers', 'settings.js'));
});

app.get('/game', (req, res) => {
    if (req.session.user) {
        const isWaiting = waitingPlayers.some(player => player.id === req.session.user.id);

        if (inGame[req.session.user.id] && !isWaiting) {
            res.sendFile(path.join(__dirname, 'views', 'game.html'));
        } else {
            res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
        }
    } else {
        res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
    }
});

app.get('/game.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'controllers', 'game.js'));
});

app.use(function(req, res, next){
    res.status(404);

    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'views', '404.html'));
        return;
    }

    if (req.accepts('json')) {
        res.send({ error: 'Not found' });
        return;
    }
    
    res.type('txt').send('Not found');
});

server.listen(3000, () => console.log('Server started on port 3000.'));