# Smart Tourism & Heritage Management Platform

A full-stack Smart Tourism & Heritage Management Platform built with **HTML/CSS/Vanilla JS**, **Node.js + Express**, and **Oracle Database**.

Brand: **HeritageTour**

---

## 1. Tech Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript (no frameworks)
- **Backend:** Node.js + Express.js
- **Database:** Oracle Database (SQL*Plus)
- **Auth:** bcryptjs password hashing + a lightweight header-based session (`x-user-id` / `x-user-role`)
- **Runs at:** http://localhost:5000

---

## 2. Prerequisites

- Node.js v18+ (tested target: v24.18.0)
- An Oracle Database instance reachable at `localhost:1521`, service `xepdb1`
- A database user `TOURISM_APP` with permission to create tables (or have your DBA create it for you):

```sql
-- Run as SYSDBA / a privileged user, connected to the pluggable database (xepdb1)
CREATE USER TOURISM_APP IDENTIFIED BY Tourism123;
GRANT CONNECT, RESOURCE, CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, UNLIMITED TABLESPACE TO TOURISM_APP;
```

---

## 3. Database Setup

Connect to Oracle as `TOURISM_APP` using SQL*Plus and run the two scripts in order:

```bash
sqlplus TOURISM_APP/Tourism123@localhost:1521/xepdb1

SQL> @database/schema.sql
SQL> @database/seed.sql
```

`schema.sql` creates all tables (`USERS`, `TOURISTS`, `ADMINS`, `TOUR_GUIDES`, `HERITAGE_SITES`, `BOOKINGS`, `PAYMENTS`, `EVENTS`, `EVENT_REGISTRATIONS`, `FEEDBACK`) using Oracle identity columns for all primary keys — no manual sequences are needed.

`seed.sql` inserts:
- The 5 required heritage sites (Taj Mahal, Qutub Minar, Gateway of India, Sanchi Stupa, Red Fort)
- 1 admin account
- 4 tour guide accounts
- 1 sample tourist account
- 4 sample events

---

## 4. Application Setup

```bash
npm install
cp .env.example .env
# edit .env if your Oracle credentials/connect string differ
npm start
```

The server starts at **http://localhost:5000** and verifies the Oracle connection on boot.

---

## 5. Demo Login Credentials (from seed.sql)

| Role       | Email                              | Password      |
|------------|-------------------------------------|---------------|
| Admin      | admin@heritagetour.com              | Admin@123     |
| Tour Guide | arjun.guide@heritagetour.com        | Guide@123     |
| Tour Guide | priya.guide@heritagetour.com        | Guide@123     |
| Tour Guide | rahul.guide@heritagetour.com        | Guide@123     |
| Tour Guide | sara.guide@heritagetour.com         | Guide@123     |
| Tourist    | tourist@example.com                 | Tourist@123   |

New tourists can also self-register from the site (Login modal → Register tab).

---

## 6. Booking & Payment Flow (business rules)

`BOOKINGS.BOOKING_STATUS` moves through the following states:

```
PENDING  →  ACCEPTED  →  PAYMENT_PROCESSING  →  CONFIRMED
   ↓                            ↓
REJECTED                (payment fails, reverts to)
                               ACCEPTED (tourist can retry payment)
```

1. **Tourist books a visit** (`POST /api/bookings`) — selects a heritage site, a **mandatory** tour guide, a visit date and ticket count. The booking is created with status `PENDING`.
2. **Tour guide reviews assigned bookings** (guide dashboard → "Assigned Bookings") and either **Accepts** (`PUT /api/guides/bookings/:id/accept` → status `ACCEPTED`) or **Rejects** (`PUT /api/guides/bookings/:id/reject` → status `REJECTED`).
3. **Tourist pays** (`POST /api/payments`) — only allowed once a booking is `ACCEPTED`. The booking briefly moves to `PAYMENT_PROCESSING` while the simulated gateway runs, then:
   - **Success** → `PAYMENTS.PAYMENT_STATUS = SUCCESS`, `BOOKINGS.BOOKING_STATUS = CONFIRMED`
   - **Failure** → `PAYMENTS.PAYMENT_STATUS = FAILED`, `BOOKINGS.BOOKING_STATUS` reverts to `ACCEPTED` so the tourist can retry.

Ticket amounts are always calculated server-side as `HERITAGE_SITES.TICKET_PRICE * NUMBER_OF_TICKETS` — never trusted from client input.

---

## 7. Project Structure

```
├── server.js                  # Express app entry point
├── config/
│   └── database.js            # Oracle connection pool (getConnection, testConnection)
├── middleware/
│   └── auth.js                # requireAuth / requireRole (x-user-id / x-user-role headers)
├── controllers/                # Business logic per domain
├── routes/                     # Express routers, mounted under /api/*
├── database/
│   ├── schema.sql              # DDL for all tables
│   └── seed.sql                # Seed data
└── public/                     # Frontend (served as static files)
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

---

## 8. API Overview

All responses follow:

```json
{ "success": true, "message": "...", "data": ... }
{ "success": false, "message": "..." }
```

| Method | Route                                  | Description                              |
|--------|-----------------------------------------|-------------------------------------------|
| GET    | /api/health                             | API/DB health check                       |
| POST   | /api/auth/register                      | Register a tourist                        |
| POST   | /api/auth/login                         | Login (any role)                          |
| GET    | /api/heritage                           | List heritage sites (`?search=`)          |
| GET    | /api/heritage/:id                       | Site details                              |
| GET    | /api/guides                             | List tour guides                          |
| GET    | /api/guides/profile/:userId             | Guide profile by user id                  |
| PUT    | /api/guides/:id/availability            | Update guide availability                 |
| GET    | /api/guides/:id/bookings                | Guide's assigned bookings                 |
| PUT    | /api/guides/bookings/:id/accept         | Guide accepts a booking                   |
| PUT    | /api/guides/bookings/:id/reject         | Guide rejects a booking                   |
| GET    | /api/events                             | List events                               |
| POST   | /api/events/:id/register                | Tourist registers for an event            |
| POST   | /api/bookings                           | Create a booking                          |
| GET    | /api/bookings/tourist/:touristId        | Tourist's booking history                 |
| GET    | /api/bookings/:id                       | Booking details                           |
| POST   | /api/payments                           | Simulated payment                         |
| GET    | /api/payments/:bookingId                | Payment for a booking                     |
| POST   | /api/feedback                           | Submit feedback                           |
| GET    | /api/feedback/site/:siteId              | Feedback for a site                       |
| GET    | /api/admin/dashboard                    | Platform totals                           |
| GET    | /api/admin/users                        | All users                                 |
| GET    | /api/admin/bookings                     | All bookings                              |
| GET    | /api/admin/reports                      | Revenue & booking reports                 |
| GET/POST/PUT/DELETE | /api/admin/heritage        | Manage heritage sites                     |
| GET    | /api/admin/guides                       | List guides                               |
| POST/PUT/DELETE | /api/admin/events              | Manage events                             |

Protected routes expect `x-user-id` and `x-user-role` headers, which the frontend sends automatically for the logged-in user (stored in `localStorage.tourismUser`).
