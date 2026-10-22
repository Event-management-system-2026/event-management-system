# Event Management System

**Live site: https://event-management-system-kappa-ten.vercel.app/**

> The API is hosted on Render's free tier, which puts the service to sleep
> after a period of inactivity. The first request after an idle period can take
> up to a minute while it wakes up — if the event list appears empty at first,
> give it a moment and refresh.

A full-stack web application for publishing events and managing registrations.

Visitors browse a board of upcoming events and claim a seat by entering their
name and email. Event organizers sign in to a separate dashboard where they can
create and edit their own events, see who registered, and remove participants.
Seat availability updates immediately as people register, and registrants
receive a confirmation email.

**Author:** Ameer
**Course:** <!-- TODO: course name, semester, instructor -->

<!-- TODO: add two screenshots — the public event board and the organizer
     dashboard. Put them in docs/ and uncomment:
![Event board](docs/attendee.png)
![Organizer dashboard](docs/organizer.png)
-->

---

## Features

**For attendees**
- Browse all upcoming events with date, location, capacity and seats remaining
- Search events by name or location, and filter by availability
- Register with name and email; full events are clearly marked and locked
- Confirmation email on successful registration

**For organizers**
- Login-protected dashboard scoped to the organizer's own events
- Create, edit and delete events
- View the list of people registered for each event
- Remove a participant, which returns their seat to the pool
- Summary statistics across all of the organizer's events

---

## Technologies

### Frontend
| Technology | Purpose |
| --- | --- |
| React 18 | UI, built with Create React App |
| Axios | HTTP requests to the API |
| CSS Custom Properties | Design system — theming from a single token block |
| React Testing Library + Jest | Component tests |

### Backend
| Technology | Purpose |
| --- | --- |
| Node.js | Runtime |
| Express 5 | REST API and routing |
| Mongoose 9 | MongoDB object modelling |
| MongoDB Atlas | Cloud database |
| Resend | Transactional confirmation emails |
| CORS | Allows the client origin to call the API |
| dotenv | Environment variable loading |
| nodemon | Auto-restart during development |

---

## Project structure

```
event-management-system/
├── client/          React frontend
│   ├── src/
│   │   ├── App.js                  Event board, search, registration
│   │   ├── OrganizerDashboard.js   Event management, registrations
│   │   ├── LoginPage.js            Organizer authentication
│   │   └── App.css                 Design system
│   └── README.md
└── server/          Express API
    └── README.md
```

<!-- TODO: adjust if your server folder has a different name or sits at the
     repository root. -->

---

## Deployment

The project is deployed as two separate services:

| Part | Host | Notes |
| --- | --- | --- |
| Frontend | Vercel | Builds from `client/`, redeploys automatically on push to `main` |
| Backend | Render | Node web service, free tier (sleeps when idle) |
| Database | MongoDB Atlas | Shared cluster |

**Environment variables in production.** These are configured in each host's
dashboard, not in the repository:

- Vercel: `REACT_APP_API_URL` points at the live Render API, not `localhost`.
  Because Create React App bakes this in at build time, changing it requires a
  redeploy, not just a restart.
- Render: `MONGO_URI`, `RESEND_API_KEY`, and `CLIENT_URL` set to the Vercel
  domain

**CORS.** The Express server must allow requests from the Vercel domain,
otherwise the browser blocks every API call from the live site.

---

## Running the project locally

The instructions below are for running the source code on your own machine —
for development, or to inspect the project. To simply use the application, open
the live site linked at the top of this file.

You need **two terminals** — one for the server, one for the client. Start the
server first; the client expects the API to be available when it loads.

### Prerequisites
- Node.js 16 or newer
- A MongoDB instance (local or MongoDB Atlas)
- A Resend account and API key, for confirmation emails

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/event-management-system.git
cd event-management-system
```

### 2. Start the server

```bash
cd server
npm install
```

Create a `.env` file inside `server/`:

```
MONGO_URI=your_mongodb_atlas_connection_string
PORT=5000
RESEND_API_KEY=your_resend_key
CLIENT_URL=http://localhost:3000
```

`CLIENT_URL` is the origin the API accepts requests from. Locally this is the
React dev server; in production it must be the deployed frontend's domain.

```bash
npm run dev
```

The API runs at `http://localhost:5000`.

### 3. Start the client

In a second terminal:

```bash
cd client
npm install
npm start
```

The app opens at `http://localhost:3000`.

If your API runs somewhere other than port 5000, create a `.env` file inside
`client/`:

```
REACT_APP_API_URL=http://localhost:5000
```

Note that Create React App only reads variables prefixed with `REACT_APP_`, and
the value is set at build time — changing it requires restarting the dev server.

### Demo accounts

| Username | Password |
| --- | --- |
| organizer1 | 1234 |
| organizer2 | 1234 |

Click **Organizer login** in the top right of the event board to sign in.

---

## Documentation

- [`client/README.md`](client/README.md) — frontend architecture, design
  decisions, accessibility
- [`server/README.md`](server/README.md) — API endpoints, data model,
  environment variables

---

## Known limitations

- Organizer routes verify that an event belongs to the organizer in the URL,
  but no token proves who the caller is. Adding JWT authentication is the
  natural next step.
- Organizer credentials are hardcoded in the server rather than stored in the
  database, and passwords are not hashed.
- Event dates are stored as strings rather than date values, so events cannot
  be sorted by date in the database.
- Registration is not atomic, so simultaneous requests could overbook an event.

See `server/README.md` for the full list and the fix for each.
