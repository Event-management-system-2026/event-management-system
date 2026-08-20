import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const EMPTY_FORM = { title: "", date: "", location: "", capacity: "" };

function OrganizerDashboard({ currentUser, onLogout }) {
  const [organizerId] = useState(currentUser?.organizerId || "");
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [editingEventId, setEditingEventId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);

  const [expandedId, setExpandedId] = useState(null);
  // { kind: "event" | "registration", eventId, registrationId, label }
  const [confirming, setConfirming] = useState(null);

  const notify = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const fetchOrganizerEvents = useCallback(async () => {
    if (!organizerId) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/organizer/${organizerId}/events`);
      setEvents(response.data);
    } catch (error) {
      notify("Couldn't load your events. Check the server connection.", "error");
    } finally {
      setLoading(false);
    }
  }, [organizerId]);

  // Load on arrival — making the organizer click "Load my events" to see
  // an empty screen was the worst moment in the old flow.
  useEffect(() => {
    fetchOrganizerEvents();
  }, [fetchOrganizerEvents]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  const fetchRegistrations = async (eventId) => {
    try {
      const response = await axios.get(
        `${API_URL}/organizer/${organizerId}/events/${eventId}/registrations`
      );
      setRegistrations((prev) => ({ ...prev, [eventId]: response.data }));
    } catch (error) {
      notify("Couldn't load registrations for that event.", "error");
    }
  };

  const toggleExpand = (eventId) => {
    const next = expandedId === eventId ? null : eventId;
    setExpandedId(next);
    if (next && !registrations[next]) fetchRegistrations(next);
  };

  const deleteRegistration = async (eventId, registrationId) => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await axios.delete(
        `${API_URL}/organizer/${organizerId}/events/${eventId}/registrations/${registrationId}`
      );

      setRegistrations((prev) => ({
        ...prev,
        [eventId]: prev[eventId].filter((reg) => reg._id !== registrationId),
      }));

      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event._id === eventId
            ? {
                ...event,
                registeredCount: response.data.registeredCount,
                remainingSeats: response.data.remainingSeats,
              }
            : event
        )
      );

      notify("Participant removed. Their seat is back in the pool.");
    } catch (error) {
      notify("Couldn't remove that participant.", "error");
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  const startEditing = (event) => {
    setCreating(false);
    setEditingEventId(event._id);
    setEditForm({
      title: event.title,
      date: event.date,
      location: event.location,
      capacity: event.capacity,
    });
  };

  const startCreating = () => {
    setEditingEventId(null);
    setCreateForm(EMPTY_FORM);
    setCreating(true);
  };

  const closeEditor = () => {
    setEditingEventId(null);
    setCreating(false);
  };

  const saveEdit = async (eventId) => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await axios.put(
        `${API_URL}/organizer/${organizerId}/events/${eventId}`,
        {
          title: editForm.title,
          date: editForm.date,
          location: editForm.location,
          capacity: Number(editForm.capacity),
        }
      );

      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event._id === eventId
            ? {
                ...response.data.event,
                remainingSeats:
                  response.data.event.capacity - response.data.event.registeredCount,
              }
            : event
        )
      );

      setEditingEventId(null);
      notify("Event updated.");
    } catch (error) {
      notify("Couldn't save those changes.", "error");
    } finally {
      setBusy(false);
    }
  };

  const createEvent = async () => {
    if (busy) return;
    if (
      !createForm.title ||
      !createForm.date ||
      !createForm.location ||
      !createForm.capacity ||
      !organizerId
    ) {
      notify("Fill in every field before saving.", "error");
      return;
    }

    setBusy(true);
    try {
      const response = await axios.post(`${API_URL}/events`, {
        title: createForm.title,
        date: createForm.date,
        location: createForm.location,
        capacity: Number(createForm.capacity),
        organizerId,
      });

      const newEvent = {
        ...response.data.event,
        remainingSeats:
          response.data.event.capacity - response.data.event.registeredCount,
      };

      setEvents((prev) => [...prev, newEvent]);
      setCreateForm(EMPTY_FORM);
      setCreating(false);
      notify(`"${newEvent.title}" is live and open for registration.`);
    } catch (error) {
      notify("Couldn't create that event.", "error");
    } finally {
      setBusy(false);
    }
  };

  const deleteEvent = async (eventId) => {
    if (busy) return;
    setBusy(true);
    try {
      await axios.delete(`${API_URL}/organizer/${organizerId}/events/${eventId}`);
      setEvents((prev) => prev.filter((event) => event._id !== eventId));
      notify("Event deleted.");
    } catch (error) {
      notify("Couldn't delete that event.", "error");
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  // --- derived numbers for the stat strip ---
  const totalCapacity = events.reduce((sum, e) => sum + (e.capacity || 0), 0);
  const totalRegistered = events.reduce((sum, e) => sum + (e.registeredCount || 0), 0);
  const fillRate = totalCapacity
    ? Math.round((totalRegistered / totalCapacity) * 100)
    : 0;

  const isEditing = editingEventId !== null;
  const editorOpen = isEditing || creating;
  const form = isEditing ? editForm : createForm;
  const setForm = isEditing ? setEditForm : setCreateForm;

  const isConfirmingEvent = (id) =>
    confirming?.kind === "event" && confirming.eventId === id;
  const isConfirmingReg = (id) =>
    confirming?.kind === "registration" && confirming.registrationId === id;

  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          <span className="brand-mark">EventFlow</span>
          <span className="brand-sub">organizer</span>
        </div>
        <span className="whoami">
          {currentUser?.username || organizerId || "Signed in"}
        </span>
        <button className="btn btn-line" onClick={onLogout}>
          Sign out
        </button>
      </header>

      <main className="wrap">
        <div className="section-head">
          <span className="eyebrow">Dashboard</span>
          <h1>Your events</h1>
        </div>

        <div className="panel">
          <div className="stats">
            <div className="stat">
              <span className="k">Events</span>
              <span className="v">{events.length}</span>
            </div>
            <div className="stat">
              <span className="k">Registered</span>
              <span className="v">{totalRegistered}</span>
            </div>
            <div className="stat">
              <span className="k">Capacity</span>
              <span className="v">{totalCapacity}</span>
            </div>
            <div className="stat">
              <span className="k">Fill rate</span>
              <span className="v">{fillRate}%</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>{editorOpen ? (isEditing ? "Edit event" : "New event") : "All events"}</h2>
            <button className="btn btn-ghost" onClick={fetchOrganizerEvents}>
              Refresh
            </button>
            {!editorOpen && (
              <button className="btn btn-quiet" onClick={startCreating}>
                Add event
              </button>
            )}
          </div>

          {editorOpen && (
            <>
              <div className="form-grid">
                <div className="full">
                  <label htmlFor="f-title">Event name</label>
                  <input
                    id="f-title"
                    type="text"
                    placeholder="Harbour Night Market"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="f-location">Location</label>
                  <input
                    id="f-location"
                    type="text"
                    placeholder="Pier 3 Warehouse"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="f-date">Date</label>
                  <input
                    id="f-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                  <p className="hint">Shown to attendees as day and month.</p>
                </div>

                <div>
                  <label htmlFor="f-capacity">Capacity</label>
                  <input
                    id="f-capacity"
                    type="number"
                    min="1"
                    placeholder="180"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button className="btn btn-quiet" onClick={closeEditor}>
                  Cancel
                </button>
                <button
                  className="btn btn-signal"
                  disabled={busy}
                  onClick={() => (isEditing ? saveEdit(editingEventId) : createEvent())}
                >
                  {busy ? "Saving…" : isEditing ? "Save changes" : "Create event"}
                </button>
              </div>
            </>
          )}

          {loading && <div className="empty"><p>Loading your events…</p></div>}

          {!loading && events.length === 0 && !editorOpen && (
            <div className="empty">
              <h3>No events yet</h3>
              <p>Create your first event and it'll appear on the public board straight away.</p>
              <button className="btn btn-signal" onClick={startCreating}>
                Add your first event
              </button>
            </div>
          )}

          {!loading && events.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th className="num">Registered</th>
                  <th className="num">Seats left</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <React.Fragment key={event._id}>
                    <tr>
                      <td>
                        <strong>{event.title}</strong>
                        <div className="sub">{event.location}</div>
                      </td>
                      <td className="sub">{event.date}</td>
                      <td className="num">
                        {event.registeredCount || 0} / {event.capacity}
                      </td>
                      <td className="num">{event.remainingSeats}</td>
                      <td className="acts">
                        {isConfirmingEvent(event._id) ? (
                          <span className="confirm-inline">
                            Delete "{event.title}" and all its registrations?
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={busy}
                              onClick={() => deleteEvent(event._id)}
                            >
                              Delete
                            </button>
                            <button
                              className="btn btn-quiet btn-sm"
                              onClick={() => setConfirming(null)}
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="row-acts">
                            <button
                              className="btn btn-ghost"
                              onClick={() => toggleExpand(event._id)}
                              aria-expanded={expandedId === event._id}
                            >
                              {expandedId === event._id ? "Hide people" : "People"}
                            </button>
                            <button
                              className="btn btn-ghost"
                              onClick={() => startEditing(event)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-ghost-danger"
                              onClick={() =>
                                setConfirming({ kind: "event", eventId: event._id })
                              }
                            >
                              Delete
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>

                    {expandedId === event._id && (
                      <tr className="subrow">
                        <td colSpan={5}>
                          <div className="subpanel">
                            <h3>Registrations</h3>

                            {!registrations[event._id] && (
                              <p className="empty-sm">Loading…</p>
                            )}

                            {registrations[event._id] &&
                              registrations[event._id].length === 0 && (
                                <p className="empty-sm">
                                  No one has registered yet. Share the event and the
                                  first names will land here.
                                </p>
                              )}

                            {registrations[event._id] &&
                              registrations[event._id].length > 0 && (
                                <table className="people">
                                  <tbody>
                                    {registrations[event._id].map((reg) => (
                                      <tr key={reg._id}>
                                        <td>{reg.name}</td>
                                        <td className="sub">{reg.email}</td>
                                        <td className="acts">
                                          {isConfirmingReg(reg._id) ? (
                                            <span className="confirm-inline">
                                              Remove {reg.name}?
                                              <button
                                                className="btn btn-danger btn-sm"
                                                disabled={busy}
                                                onClick={() =>
                                                  deleteRegistration(event._id, reg._id)
                                                }
                                              >
                                                Remove
                                              </button>
                                              <button
                                                className="btn btn-quiet btn-sm"
                                                onClick={() => setConfirming(null)}
                                              >
                                                Cancel
                                              </button>
                                            </span>
                                          ) : (
                                            <span className="row-acts">
                                              <button
                                                className="btn btn-ghost-danger"
                                                onClick={() =>
                                                  setConfirming({
                                                    kind: "registration",
                                                    eventId: event._id,
                                                    registrationId: reg._id,
                                                  })
                                                }
                                              >
                                                Remove
                                              </button>
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
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

export default OrganizerDashboard;