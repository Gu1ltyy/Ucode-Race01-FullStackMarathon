const db = require('../db.js');

class User {
    constructor(user) {
        this.data = {
            login: user.login,
            password: user.password,
            full_name: user.fullName,
            email: user.email,
            wins: user.wins,
            losses: user.losses
        };
    }

    async save() {
        const isLoginUnique = await db.checkUnique('race01_user', 'login', this.data.login);
        const isEmailUnique = await db.checkUnique('race01_user', 'email', this.data.email);
    
        if (!isLoginUnique) {
            throw new Error('This login is already taken.');
        }
    
        if (!isEmailUnique) {
            throw new Error('This email is already registered.');
        }
    
        return db.save('race01_user', this.data);
    }

    static async login(data) {
        const user = await db.login('race01_user', 'login', data.login);
        if (user && user.password === data.password) {
            return user;
        } else {
            return null;
        }
    }

    static async findUser(data) {
        const user = await db.findUser('race01_user', 'login', data.login);
        if (user) {
            return user;
        } else {
            return null;
        }
    }

    async update(oldLogin, oldEmail) {
        const isLoginUnique = await db.checkUnique('race01_user', 'login', this.data.login);
        const isEmailUnique = await db.checkUnique('race01_user', 'email', this.data.email);
    
        if (!isLoginUnique && this.data.login !== oldLogin) {
            throw new Error('This login is already taken.');
        }
    
        if (!isEmailUnique && this.data.email !== oldEmail) {
            throw new Error('This email is already registered.');
        }
    
        return db.update('race01_user', oldLogin, this.data);
    }

    async delete() {
        return db.deleteAccount('race01_user', this.data.login);
    }
}

module.exports = User;