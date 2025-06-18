# 🎟️ Mini Event Booking System

A full-stack web app where users can browse and book events, and admins can manage them.

## 🚀 Tech Stack

- **Frontend**: React.js + Tailwind CSS
- **Backend**: Node.js (Express)
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis
- **Auth**: JWT

## 🔑 Features

- ✅ User Signup/Login (JWT, hashed passwords)
- ✅ Browse & Book Events (1 booking per user)
- ✅ Admin: Create/Edit/Delete Events
- ✅ Redis caching for available slots
- ✅ Search & Pagination
- ✅ Dashboards for Users & Admins
- ✅ Error handling (frontend & backend)

## 🌐 Live API

**Backend**: [https://ticket-api-ttez.onrender.com/api](https://ticket-api-ttez.onrender.com/api)

> Example:

```bash
POST /auth/login
POST /auth/signup
GET /events
POST /bookings/:eventId
```
