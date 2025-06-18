    const express = require('express');
    const { body, param } = require('express-validator');
    const controller = require('../controllers/event.controller');
    const { validate } = require('../middleware/validation.middleware');
    const { verifyToken, requireRole } = require('../middleware/auth.middleware');

    const router = express.Router();

    // Admin CRUD
    router.post(
        '/',
        verifyToken,
        requireRole('ADMIN'),
        validate([
            body('title').notEmpty(),
            body('description').notEmpty(),
            body('location').notEmpty(),
            body('date').isISO8601(),
            body('totalSlots').isInt({ min: 1 }),
            body('tags').isArray()
        ]),
        controller.createEvent
    );
    router.put(
        '/:id',
        verifyToken,
        requireRole('ADMIN'),
        validate([param('id').isInt(), body('title').optional().notEmpty()]),
        controller.updateEvent
    );
    router.delete('/:id', verifyToken, requireRole('ADMIN'), validate([param('id').isInt()]), controller.deleteEvent);

    // Public listing & booking
    router.get('/', controller.listEvents);
    router.post('/:id/book', verifyToken, validate([param('id').isInt()]), controller.bookEvent);

    router.get('/:id/slots', controller.getSlotsLeft);

    // admin dashboard 
    router.get('/:id/bookings', verifyToken, requireRole('ADMIN'), validate([param('id').isInt()]), controller.getEventBookings);

    // user dashboard
    router.get('/bookings', verifyToken, controller.getUserBookings);

    module.exports = router;