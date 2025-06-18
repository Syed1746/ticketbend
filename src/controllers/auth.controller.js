const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const redis = require('../utils/redis.client');
const { signToken } = require('../utils/jwt.utils');
const prisma = new PrismaClient();

exports.signup = async(req, res, next) => {
    const { name, email, password, confirmPassword, role } = req.body;
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(409).json({ message: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { name, email, password: hashed, role } });

    // Cache user basic info
    await redis.set(`user:${user.id}`, JSON.stringify({ id: user.id, email, role }));

    const token = signToken({ id: user.id, role: user.role });
    res.status(201).json({ token });
};

exports.login = async(req, res, next) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = signToken({ id: user.id, role: user.role });
    res.json({ token });
};

exports.logout = async(req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : null;


    // Optionally blacklist token in Redis until expiry
    if (token) {
        await redis.set(`bl:${token}`, '1', 'EX', 3600);
    }
    res.json({ message: 'Logged out' });
};