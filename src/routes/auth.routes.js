// routes/auth.routes.js
const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/auth.controller');
const { validate } = require('../middleware/validation.middleware');

const router = express.Router();

router.post(
    '/signup',
    validate([
        body('name').notEmpty(),
        body('email').isEmail(),
        body('password').isLength({ min: 6 }),
        body('confirmPassword').exists(),
        body('role').isIn(['ADMIN', 'USER'])
    ]),
    controller.signup
);

router.post(
    '/login',
    validate([
        body('email').isEmail(),
        body('password').notEmpty()
    ]),
    controller.login
);

router.post('/logout', controller.logout);

module.exports = router;