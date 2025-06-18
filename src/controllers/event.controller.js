const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redis = require('../utils/redis.client.js');

// Create event (Admin only)
exports.createEvent = async(req, res, next) => {
    try {
        const data = req.body;
        const event = await prisma.event.create({ data });
        res.status(201).json(event);
    } catch (err) {
        console.error('Create Event Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


// Edit event
// Edit event
exports.updateEvent = async(req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // Convert date to ISO 8601 format if it exists
        if (data.date) {
            const isoDate = new Date(data.date).toISOString();
            if (isNaN(new Date(isoDate).getTime())) {
                return res.status(400).json({ message: 'Invalid date format' });
            }
            data.date = isoDate;
        }

        // Update event
        const event = await prisma.event.update({
            where: { id: parseInt(id) },
            data,
        });

        res.json(event);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};


// Delete event
exports.deleteEvent = async(req, res) => {
    const { id } = req.params;
    try {
        const eventId = parseInt(id);

        // Delete bookings related to this event
        await prisma.booking.deleteMany({
            where: { eventId }
        });

        // Now delete the event
        await prisma.event.delete({
            where: { id: eventId }
        });

        res.status(204).send();
    } catch (err) {
        console.error('Delete Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};


// List events with search & pagination
exports.listEvents = async(req, res) => {
    const { page = 1, perPage = 10, search = '' } = req.query;
    const skip = (page - 1) * perPage;
    const where = search ? { OR: [{ title: { contains: search } }, { tags: { has: search } }] } : {};
    const [events, total] = await Promise.all([
        prisma.event.findMany({ where, skip: +skip, take: +perPage, orderBy: { date: 'asc' } }),
        prisma.event.count({ where })
    ]);
    res.json({ events, total, page: +page, perPage: +perPage });
};

// Book event (once per user)
exports.bookEvent = async(req, res) => {
    const userId = req.user.id;
    const eventId = parseInt(req.params.id);
    // Check existing booking
    const existing = await prisma.booking.findUnique({ where: { userId_eventId: { userId, eventId } } });
    if (existing) return res.status(409).json({ message: 'Already booked' });
    // Check slots
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    const bookedCount = await prisma.booking.count({ where: { eventId } });
    if (bookedCount >= event.totalSlots) return res.status(400).json({ message: 'Sold out' });
    const booking = await prisma.booking.create({ data: { userId, eventId } });
    res.status(201).json(booking);
};

exports.bookEvent = async(req, res) => {
    const userId = req.user.id;
    const eventId = parseInt(req.params.id);
    const redisKey = `event:${eventId}:slots`;

    try {
        // 1. Check if user already booked
        const existing = await prisma.booking.findUnique({
            where: { userId_eventId: { userId, eventId } },
        });
        if (existing) return res.status(409).json({ message: 'Already booked' });

        // 2. Get slot count from Redis (or fallback to DB)
        let slotsLeft = await redis.get(redisKey);

        if (slotsLeft === null) {
            const event = await prisma.event.findUnique({ where: { id: eventId } });
            const bookedCount = await prisma.booking.count({ where: { eventId } });

            slotsLeft = event.totalSlots - bookedCount;
            await redis.set(redisKey, slotsLeft, { EX: 60 }); // Cache for 60 seconds
        }

        // 3. If full, reject
        if (parseInt(slotsLeft) <= 0) {
            return res.status(400).json({ message: 'Sold out' });
        }

        // 4. Decrement slot in Redis (atomic)
        const newSlotCount = await redis.decr(redisKey);

        if (newSlotCount < 0) {
            // Roll back if overbooked
            await redis.incr(redisKey);
            return res.status(400).json({ message: 'Sold out' });
        }

        // 5. Create booking
        const booking = await prisma.booking.create({
            data: { userId, eventId },
        });

        res.status(201).json(booking);
    } catch (err) {
        console.error('Book Event Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getSlotsLeft = async(req, res) => {
    const eventId = parseInt(req.params.id, 10);
    const slotKey = `event:${eventId}:slots`;
    try {
        let slotsLeft = await redis.get(slotKey);
        if (slotsLeft === null) {
            const event = await prisma.event.findUnique({ where: { id: eventId } });
            const bookedCount = await prisma.booking.count({ where: { eventId } });
            slotsLeft = event.totalSlots - bookedCount;
        }
        res.json({ eventId, slotsLeft: parseInt(slotsLeft, 10) });
    } catch (e) {
        next(e);
    }
}

// src/controllers/event.controller.js
exports.getEventBookings = async(req, res, next) => {
    const eventId = parseInt(req.params.id, 10);
    try {
        // Fetch the event to ensure it exists
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Fetch all bookings for this event, including user info
        const bookings = await prisma.booking.findMany({
            where: { eventId },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });

        res.json({
            event: { id: event.id, title: event.title, totalSlots: event.totalSlots },
            bookings,
        });
    } catch (err) {
        next(err);
    }
};

// src/controllers/event.controller.js
exports.getUserBookings = async(req, res, next) => {
    const userId = req.user.id;
    try {
        // Fetch all bookings belonging to this user, include event details
        const bookings = await prisma.booking.findMany({
            where: { userId },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        location: true,
                        date: true,
                        image: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ bookings });
    } catch (err) {
        next(err);
    }
};