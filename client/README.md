# EventFlow — Client

React frontend for an event registration system. Attendees browse events and
claim a seat; organizers sign in to manage their events and the people
registered for them.

> **TODO:** add screenshots. Two are enough — the attendee board and the
> organizer dashboard. Put them in `docs/` and link them here.
>
> ![Attendee board](docs/attendee.png)
> ![Organizer dashboard](docs/organizer.png)

---

## Requirements

- Node.js 16 or newer
- The EventFlow server running (see the server README)

## Setup

```bash
npm install
npm start
```

The app runs at `http://localhost:3000` and expects the API at
`http://localhost:5000` by default.

To point it somewhere else, create a `.env` file in the project root:

```
REACT_APP_API_URL=http://localhost:5000
```

CRA only exposes variables prefixed with `REACT_APP_`, and the value is baked
in at build time — changing it means restarting the dev server.

## Scripts

|     Command     | What it does |
| ----------------| -------------|
| `npm start`     | Development server with hot reload |
| `npm test`      | Test suite in watch mode |
| `npm run build` | Production bundle in `build/` |

---

## Project structure

```
src/
├── App.js                  Attendee board, filtering, registration, routing
├── OrganizerDashboard.js   Event CRUD, registration management
├── LoginPage.js            Organizer authentication
├── App.css                 The entire design system
└── index.css               Global reset only
```

There is no router. `App.js` decides what to render from two pieces of state:
`currentUser` (an organizer is signed in) and `showOrganizerLogin` (the login
screen was requested). Everything else is the public board.

All styling lives in `App.css`, driven by a token block at the top of the file
— six colours, three typefaces, one spacing scale. Every downstream rule
references those variables, so the whole app can be rethemed by editing about
fifteen lines.

---

## How it works

**Registration.** Clicking Register on a row opens a drawer beneath it with
name and email fields. On submit, the client POSTs to `/register` and updates
that event's `remainingSeats` from the response, so the seat count is correct
without refetching the list.

**Organizer session.** After a successful login the user object is written to
`sessionStorage`, so refreshing the page keeps the organizer signed in.
Closing the tab signs them out. `sessionStorage` was chosen over
`localStorage` deliberately: a session that outlives the browser tab is a poor
default for anything behind a login, particularly on a shared machine.

**Filtering.** The filtered list is derived on every render rather than stored
in state, so it can't drift out of sync with the source data when a seat count
changes mid-session.

---

## Design decisions

The visual direction is a **departures board**. Events are inherently
time-ordered and capacity-bound, which is exactly what a departures board
encodes — so the monospaced figures, the status vocabulary, and the flip
animation carry information rather than decorating it.

**One accent colour.** Amber appears only on live, actionable elements: the
primary action, the open status, the date numeral. Full events drop to grey.
An available event pulls the eye without any element having to shout.

**Three typefaces with distinct jobs.** Barlow Condensed for headings, Public
Sans for reading, IBM Plex Mono for anything numeric. The monospace isn't
styling — it makes times and seat counts align vertically in columns, which is
the actual reason real departure boards use it.

**Two audiences, two registers.** The attendee page is a browsing surface:
dark, wide-spaced, one large gesture. The organizer dashboard is a working
tool: white, dense, table-first, optimised for scanning numbers across rows.
Same design tokens, opposite intent.

**Destructive actions are staged.** Removing a participant hides its control
until the row is hovered or focused, then asks for confirmation naming the
person — "Remove Dana Levi?" rather than "this participant." Browser
`window.confirm` dialogs were removed entirely; they can't be styled and can't
name what they're about to destroy.

**Motion is tied to state changes.** Four animations, each triggered by
something happening: rows entering when the filter changes, the drawer
opening, the seat counter flashing when it drops, and buttons responding to
being pressed. Nothing animates ambiently.

## Accessibility

- Visible keyboard focus on every interactive element
- All text meets WCAG AA contrast (4.5:1) — four colours were measured and
  corrected during the redesign
- Screen-reader labels on board cells that rely on visual column headers
- Buttons labelled with their event, so a screen reader hears "Register for
  Harbour Night Market" rather than six identical "Register" buttons
- `prefers-reduced-motion` disables all animation
- Layout responds down to 375px; board rows fold into cards below 800px

---

## Known limitations

- **No real authentication.** The client stores the user object returned by
  `/login`, but requests carry no token. See the server README.
- **Free-text dates.** Older events may have dates typed as arbitrary strings.
  `splitDate()` in `App.js` falls back to printing the raw value rather than
  showing `NaN`.
- **No duplicate-registration check** on the client; the same email can
  register twice unless the server prevents it.

> **TODO:** delete any of the above that you've since fixed.