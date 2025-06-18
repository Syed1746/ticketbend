const { verifyToken } = require('../utils/jwt.utils');

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : null;
    if (!token) return res.status(401).json({ message: 'No token' });
    try {
        req.user = verifyToken(token);
        next();
    } catch {
        res.status(401).json({ message: 'Invalid token' });
    }
};

exports.requireRole = (role) => (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ message: 'Forbidden' });
    next();
};