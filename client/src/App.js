import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import OrganizerDashboard from "./OrganizerDashboard";
import LoginPage from "./LoginPage";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const SESSION_KEY = "eventflow:user";

/**
 * Reads the saved session once, on first render.
 * Wrapped because sessionStorage throws in private-browsing modes on
 * some browsers, and a storage failure should never break the app.
 */
function loadSession() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Your `date` field is free text, so this tries to read it as a real
 * date for the board's day/month block and falls back to printing
 * whatever the organizer typed. Never throws, never shows "NaN".
 */
function splitDate(value) {
  const parsed = new Date(value);
  if (value && !Number.isNaN(parsed.getTime())) {
    return {
      day: String(parsed.getDate()).padStart(2, "0"),
      month: parsed.toLocaleString("en", { month: "short" }),
    };
  }
  return { raw: value || "TBC" };
}

function App() {
  // --- all hooks first, before any early return ---
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", eventId: "" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [currentUser, setCurrentUser] = useState(loadSession);
  const [showOrganizerLogin, setShowOrganizerLogin] = useState(false);
  const [openEventId, setOpenEventId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | open | full
  const [pulseId, setPulseId] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/events`)
      .then((response) => {
        setEvents(response.data);
      })
      .catch((error) => {
        console.error("Error fetching events:", error);
        setMessage("Couldn't load events. Check that the server is running.");
        setMessageType("error");
      })
      .finally(() => setLoading(false));
  }, []);

  // Keep the saved session in step with state, so a refresh doesn't
  // drop the organizer back to the public board.
  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch (error) {
      // Storage unavailable — the app still works, just without persistence.
    }
  }, [currentUser]);

  // Auto-dismiss the toast so it never sits there stale.
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  // Clear the seat-change highlight once it has played.
  useEffect(() => {
    if (!pulseId) return undefined;
    const timer = setTimeout(() => setPulseId(null), 1000);
    return () => clearTimeout(timer);
  }, [pulseId]);

  const handleLogout = () => {
    setCurrentUser(null);
    setShowOrganizerLogin(false);
  };

  // --- early returns come after every hook ---
  if (currentUser?.role === "organizer") {
    return <OrganizerDashboard currentUser={currentUser} onLogout={handleLogout} />;
  }

  if (showOrganizerLogin) {
    return (
      <LoginPage
        onLogin={setCurrentUser}
        onBack={() => setShowOrganizerLogin(false)}
      />
    );
  }

  const handleRegister = async (eventId) => {
    if (submitting) return; // guard against a second click mid-request

    if (!formData.name || !formData.email) {
      setMessage("Please enter your name and email first");
      setMessageType("error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/register`, {
        name: formData.name,
        email: formData.email,
        eventId: eventId,
      });

      setMessage(response.data.message || "Registration successful");
      setMessageType("success");
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event._id === eventId
            ? { ...event, remainingSeats: response.data.remainingSeats }
            : event
        )
      );
      setFormData({ name: "", email: "", eventId: "" });
      setOpenEventId(null);
      setPulseId(eventId);
    } catch (error) {
      console.error("Registration error:", error.response?.data || error.message);
      setMessage(error.response?.data?.message || "Registration failed.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  // --- filtering ---
  const term = query.trim().toLowerCase();
  const visibleEvents = events.filter((event) => {
    const isFull = event.remainingSeats <= 0;
    if (statusFilter === "open" && isFull) return false;
    if (statusFilter === "full" && !isFull) return false;
    if (!term) return true;
    return (
      (event.title || "").toLowerCase().includes(term) ||
      (event.location || "").toLowerCase().includes(term)
    );
  });

  const filtersActive = term !== "" || statusFilter !== "all";
  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
  };

  // Changing the key remounts the rows, which replays their entry
  // animation — the cheapest way to make filtering feel physical.
  const listKey = `${statusFilter}|${term}`;

  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          <span className="brand-mark">EventFlow</span>
          <span className="brand-sub">events &amp; registration</span>
        </div>
        <button className="btn btn-line" onClick={() => setShowOrganizerLogin(true)}>
          Organizer login
        </button>
      </header>

      <main className="wrap">
        <div className="section-head">
          <span className="eyebrow">Now boarding</span>
          <h1>Available events</h1>
          <p className="lede">
            Pick an event and add your name and email to claim a seat. Seats are
            released the moment someone cancels, so an event marked full is worth
            checking again.
          </p>
        </div>

        <div className="filters">
          <div className="filter-search">
            <label className="sr-only" htmlFor="event-search">
              Search events by name or location
            </label>
            <input
              id="event-search"
              type="search"
              placeholder="Search by name or location"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="chips" role="group" aria-label="Filter by availability">
            {[
              { id: "all", label: "All" },
              { id: "open", label: "Registering" },
              { id: "full", label: "Full" },
            ].map((chip) => (
              <button
                key={chip.id}
                className="chip"
                aria-pressed={statusFilter === chip.id}
                onClick={() => setStatusFilter(chip.id)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <span className="filter-count" role="status" aria-live="polite">
            {visibleEvents.length} of {events.length}
          </span>
        </div>

        <div className="board">
          <div className="board-head" aria-hidden="true">
            <span>Date</span>
            <span>Event</span>
            <span>Status</span>
            <span className="ta-r">Capacity</span>
            <span className="ta-r">Seats left</span>
          </div>

          {loading && (
            <div aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div className="skeleton-row" key={i}>
                  <div className="bar tall" />
                  <div className="bar" />
                  <div className="bar" />
                </div>
              ))}
            </div>
          )}

          {!loading && events.length === 0 && (
            <div className="empty empty-dark">
              <h3>No events scheduled</h3>
              <p>Nothing is open for registration right now. Check back soon.</p>
            </div>
          )}

          {!loading && events.length > 0 && visibleEvents.length === 0 && (
            <div className="empty empty-dark">
              <h3>No events match</h3>
              <p>Nothing here fits that search. Try a different word, or clear the filters.</p>
              <button className="btn btn-signal" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          )}

          {!loading && visibleEvents.length > 0 && (
            <ul className="board-list" key={listKey}>
              {visibleEvents.map((event, i) => {
                const isFull = event.remainingSeats <= 0;
                const isOpen = openEventId === event._id;
                const when = splitDate(event.date);

                return (
                  <li
                    className="board-row"
                    key={event._id}
                    style={{ "--i": Math.min(i, 8) }}
                  >
                    <div className="cell-date">
                      {when.raw ? (
                        <span className="raw">{when.raw}</span>
                      ) : (
                        <>
                          <span className="day">{when.day}</span>
                          <span className="mon">{when.month}</span>
                        </>
                      )}
                    </div>

                    <div className="cell-info">
                      <h3 className="event-title">{event.title}</h3>
                      <div className="event-venue">{event.location}</div>
                    </div>

                    <div className="cell-status">
                      <span
                        className={`status ${isFull ? "status-full" : "status-open"}`}
                      >
                        {isFull ? "Full" : "Registering"}
                      </span>
                    </div>

                    <div className="cell-cap">
                      <span className="sr-only">Capacity </span>
                      {event.capacity}
                    </div>

                    <div className="cell-seats">
                      <span className="sr-only">Seats left </span>
                      <span
                        className={`taken ${pulseId === event._id ? "seats-pulse" : ""}`}
                      >
                        {event.remainingSeats}
                      </span>
                      <span className="of" aria-hidden="true"> / {event.capacity}</span>
                    </div>

                    <div className="cell-act">
                      <button
                        className="btn btn-signal"
                        disabled={isFull}
                        aria-expanded={isOpen}
                        aria-label={
                          isFull
                            ? `${event.title} is full`
                            : `Register for ${event.title}`
                        }
                        onClick={() => setOpenEventId(isOpen ? null : event._id)}
                      >
                        {isFull ? "Full" : isOpen ? "Close" : "Register"}
                      </button>
                    </div>

                    {isOpen && !isFull && (
                      <div
                        className="drawer"
                        role="group"
                        aria-label={`Register for ${event.title}`}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setOpenEventId(null);
                        }}
                      >
                        <div className="drawer-grid">
                          <div className="field">
                            <label htmlFor={`name-${event._id}`}>Your name</label>
                            <input
                              id={`name-${event._id}`}
                              type="text"
                              placeholder="Full name"
                              disabled={submitting}
                              value={formData.name}
                              onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                              }
                            />
                          </div>

                          <div className="field">
                            <label htmlFor={`email-${event._id}`}>Email</label>
                            <input
                              id={`email-${event._id}`}
                              type="email"
                              placeholder="you@example.com"
                              disabled={submitting}
                              value={formData.email}
                              onChange={(e) =>
                                setFormData({ ...formData, email: e.target.value })
                              }
                            />
                          </div>

                          <button
                            className="btn btn-signal"
                            disabled={submitting}
                            onClick={() => handleRegister(event._id)}
                          >
                            {submitting ? "Confirming…" : "Confirm seat"}
                          </button>

                          <button
                            className="btn btn-line"
                            disabled={submitting}
                            onClick={() => setOpenEventId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {filtersActive && visibleEvents.length > 0 && (
          <p className="filter-note">
            Showing {visibleEvents.length} of {events.length} events.{" "}
            <button className="btn btn-ghost" onClick={clearFilters}>
              Clear filters
            </button>
          </p>
        )}
      </main>

      {message && (
        <div
          className={`toast toast-up ${messageType === "error" ? "toast-error" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span>{message}</span>
          <button onClick={() => setMessage("")} aria-label="Dismiss">
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

export default App;