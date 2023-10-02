const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const connection = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    multipleStatements: true
});

connection.connect((error) => {
    if (error) throw error;
    console.log('Successfully connected to the database.');

    const sqlScript = fs.readFileSync(path.join(__dirname, 'db.sql'), 'utf8');
    connection.query(sqlScript, (error) => {
        if (error) throw error;
        console.log('Database setup completed.');
    });
});

function checkUnique(table, column, value) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM ${table} WHERE ${column} = ?`;
        connection.query(query, value, (error, results) => {
            if (error) reject(error);
            resolve(results.length === 0);
        });
    });
}

function save(table, data) {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO ${table} SET ?`;
        connection.query(query, data, (error) => {
            if (error) reject(error);
            resolve();
        });
    });
}

function login(table, column, value) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM ${table} WHERE ${column} = ?`;
        connection.query(query, value, (error, results) => {
            if (error) reject(error);
            resolve(results[0]);
        });
    });
}

function findUser(table, column, value) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM ${table} WHERE ${column} = ?`;
        connection.query(query, value, (error, results) => {
            if (error) reject(error);
            resolve(results[0]);
        });
    });
}

function update(table, oldLogin, data) {
    let query = 'UPDATE ?? SET login = ?, full_name = ?, email = ?, wins = ?, losses = ?';
    let params = [table, data.login, data.full_name, data.email, data.wins, data.losses];

    if (data.password) {
        query += ', password = ?';
        params.push(data.password);
    }

    query += ' WHERE login = ?';
    params.push(oldLogin);

    return new Promise((resolve, reject) => {
        connection.query(query, params, (error) => {
            if (error) reject(error);
            resolve();
        });
    });
}

function updateWinsAndLosses(table, login, wins, losses) {
    let query = 'UPDATE ?? SET wins = ?, losses = ? WHERE login = ?';
    let params = [table, wins, losses, login];

    return new Promise((resolve, reject) => {
        connection.query(query, params, (error) => {
            if (error) reject(error);
            resolve();
        });
    });
}

function deleteAccount(table, login) {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM ?? WHERE login = ?';
        connection.query(query, [table, login], (error) => {
            if (error) reject(error);
            resolve();
        });
    });
}

module.exports = { checkUnique, save, login, findUser, update, deleteAccount, updateWinsAndLosses };