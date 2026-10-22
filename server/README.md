# EventFlow — Server

REST API for the Event Management System. Serves events, handles attendee
registration with confirmation emails, and provides organizer-scoped
management endpoints.

Live API: <!-- TODO: your Render URL, e.g. https://eventflow-api.onrender.com -->

> Hosted on Render's free tier, which sleeps after inactivity. The first
> request after an idle period can take up to a minute.

---

## Technologies

| Package | Purpose |
| --- | --- |
| Express 5 | HTTP server and routing |
| Mongoose 9 | MongoDB object modelling |
| Resend | Transactional confirmation emails |
| CORS | Allows browser requests from the deployed frontend |
| dotenv | Loads environment variables from `.env` |
| nodemon (dev) | Restarts the server on file changes |

Database: **MongoDB Atlas**.

---

## Setup

### Requirements
- Node.js 16 or newer
- A MongoDB Atlas cluster (or a local MongoDB instance)
- A Resend account and API key

### Install and run

```bash
npm install
npm run dev     # development, with auto-restart
npm start       # production
```

The server listens on port `5000` by default and responds to `GET /` with a
status message, which is a quick way to confirm it's up.

### Environment variables

Create a `.env` file in the server root. **Never commit this file.**

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
PORT=5000
RESEND_API_KEY=re_xxxxxxxxxxxx
CLIENT_URL=http://localhost:3000
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `RESEND_API_KEY` | Yes | Sends registration confirmation emails |
| `PORT` | No | Defaults to 5000 |
| `CLIENT_URL` | No | Origin allowed by CORS; defaults to `http://localhost:3000`. **In production this must be set to the Vercel domain**, or the browser will block every request from the live site. |

---

## Data model

### Event

| Field | Type | Notes |
| --- | --- | --- |
| `title` | String | Required |
| `date` | String | Required — stored as free text, not a Date |
| `location` | String | Required |
| `capacity` | Number | Required |
| `registeredCount` | Number | Defaults to 0 |
| `organizerId` | String | Required — owner of the event |

`remainingSeats` is not stored. It is computed as
`capacity - registeredCount` and added to every event in the API response.

### Registration

| Field | Type | Notes |
| --- | --- | --- |
| `name` | String | Required |
| `email` | String | Required |
| `eventId` | ObjectId | Reference to an Event |
| `createdAt` | Date | Defaults to now |

---

## Authentication

Organizer accounts are defined as a hardcoded array in `index.js` — there is no
user collection in the database.

| Username | Password | organizerId |
| --- | --- | --- |
| organizer1 | 1234 | organizer1 |
| organizer2 | 1234 | organizer2 |

`POST /login` checks the credentials and returns the matching user object. No
token is issued; see **Known limitations**.

---

## API reference

### Public

**`GET /`**
Health check. Returns a plain-text status message.

**`GET /events`**
Returns every event, each with a computed `remainingSeats`.

**`POST /register`**
```json
{ "name": "Dana Levi", "email": "dana@example.com", "eventId": "..." }
```
Creates a registration, increments `registeredCount`, and sends a confirmation
email via Resend. Returns the registration and the updated `remainingSeats`.

| Status | Meaning |
| --- | --- |
| 201 | Registered |
| 400 | Missing fields, or the event is full |
| 404 | Event not found |

Email failures are caught and logged but do not fail the request — a
registration still succeeds if the email cannot be sent.

**`POST /login`**
```json
{ "username": "organizer1", "password": "1234" }
```
Returns `{ message, user: { username, role, organizerId } }`, or 401.

**`POST /events`**
Creates an event. Body: `title`, `date`, `location`, `capacity`,
`organizerId`. Returns 400 if any field is missing.

### Organizer

Every route below verifies that the event belongs to the `organizerId` in the
path, and returns **403** if it does not.

| Method | Route | Returns |
| --- | --- | --- |
| `GET` | `/organizer/:organizerId/events` | That organizer's events, with `remainingSeats` |
| `PUT` | `/organizer/:organizerId/events/:eventId` | Updated event. Only the fields present in the body are changed |
| `DELETE` | `/organizer/:organizerId/events/:eventId` | Deletes the event **and all of its registrations** |
| `GET` | `/organizer/:organizerId/events/:eventId/registrations` | Array of registrations for that event |
| `DELETE` | `/organizer/:organizerId/events/:eventId/registrations/:registrationId` | Removes a participant and returns the updated `registeredCount` and `remainingSeats` |

---

## Deployment

Deployed on **Render** as a Node web service, with the database on **MongoDB
Atlas** and the frontend on **Vercel**.

Required configuration:
- All environment variables above are set in the Render dashboard, not in the
  repository.
- `CLIENT_URL` must be the Vercel domain.
- The Atlas cluster's Network Access list must permit Render's outbound
  addresses. Render's free tier does not provide static IPs, so this is
  typically set to allow access from anywhere, which is acceptable for a
  student project but not for production.

---

## Known limitations

These are real and worth stating plainly. Each one has a clear fix.

**Authentication is not enforced.** `POST /login` verifies credentials but
issues no token, so later requests carry no proof of identity. Organizer routes
trust the `organizerId` in the URL. They do correctly verify that the event
belongs to that organizer, so one organizer cannot modify another's events by
ID alone — but anyone who knows an organizer ID can act as that organizer.
*Fix:* issue a signed JWT on login, send it in an `Authorization` header, and
verify in middleware that the token's organizer matches the route parameter.

**Passwords are stored in plain text** in a hardcoded array.
*Fix:* a `User` collection with bcrypt-hashed passwords.

**`POST /events` is unprotected.** Unlike the other write routes, it accepts
any `organizerId` in the body without checking it.

**Registration has a race condition.** `registeredCount` is read, incremented,
and saved as separate steps, so two requests arriving together can both pass
the capacity check and overbook the event.
*Fix:* a single atomic `findOneAndUpdate` with `$inc`, conditioned on
`registeredCount < capacity`.

**Duplicate registrations are allowed.** The same email can register for the
same event repeatedly, consuming a seat each time.
*Fix:* a compound unique index on `{ eventId, email }`.

**Capacity can be set below the registered count,** producing a negative
`remainingSeats`.
*Fix:* reject an update where `capacity < registeredCount`.

**Emails send from Resend's shared test address** (`onboarding@resend.dev`),
which can only deliver to the address that owns the Resend account.
*Fix:* verify a domain in Resend and send from it.

**Dates are stored as strings,** so events cannot be sorted or filtered by
date in the database.
