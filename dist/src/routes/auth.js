"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const db_1 = require("../db");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function default_1(fastify) {
    fastify.post('/register', async (request, reply) => {
        const { username, email, password } = request.body;
        const hash = await bcrypt_1.default.hash(password, 10);
        const { rows } = await db_1.pool.query('INSERT INTO users(username, email, password_hash) VALUES($1,$2,$3) RETURNING id, username, email', [username, email, hash]);
        reply.send(rows[0]);
    });
    fastify.post('/login', async (request, reply) => {
        const { email, password } = request.body;
        const { rows } = await db_1.pool.query('SELECT * FROM users WHERE email=$1', [email]);
        const user = rows[0];
        if (!user)
            return reply.status(401).send({ error: 'User not found' });
        const valid = await bcrypt_1.default.compare(password, user.password_hash);
        if (!valid)
            return reply.status(401).send({ error: 'Wrong password' });
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        reply.send({ token, user: { id: user.id, username: user.username, email: user.email } });
    });
}
