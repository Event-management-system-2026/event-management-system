import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function OrganizerDashboard({ currentUser }) {
  const [organizerId, setOrganizerId] = useState(currentUser?.organizerId || "");
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState({});
  const [message, setMessage] = useState("");

  const [editingEventId, setEditingEventId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    date: "",
    location: "",
    capacity: "",
});

const [createForm, setCreateForm] = useState({
  title: "",
  date: "",
  location: "",
  capacity: "",
});

  const fetchOrganizerEvents = async () => {
    if (!organizerId) {
      setMessage("Please enter organizer ID");
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/organizer/${organizerId}/events`
      );
      setEvents(response.data);
      setMessage("");
    } catch (error) {
      setMessage("Failed to fetch organizer events");
    }
  };

  const fetchRegistrations = async (eventId) => {
    try {
      const response = await axios.get(
        `${API_URL}/organizer/${organizerId}/events/${eventId}/registrations`
      );

      setRegistrations({
        ...registrations,
        [eventId]: response.data,
      });
    } catch (error) {
      setMessage("Failed to fetch registrations");
    }
  };

  const deleteRegistration = async (eventId, registrationId) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to remove this participant?"
  );

  if (!confirmDelete) return;

  try {
    const response = await axios.delete(
      `${API_URL}/organizer/${organizerId}/events/${eventId}/registrations/${registrationId}`
    );

    setRegistrations({
      ...registrations,
      [eventId]: registrations[eventId].filter(
        (reg) => reg._id !== registrationId
      ),
    });

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

    setMessage("Participant removed successfully");
  } catch (error) {
    setMessage("Failed to remove participant");
  }
};

  const startEditing = (event) => {
    setEditingEventId(event._id);
    setEditForm({
      title: event.title,
      date: event.date,
      location: event.location,
      capacity: event.capacity,
  });
};

const saveEdit = async (eventId) => {
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
                response.data.event.capacity -
                response.data.event.registeredCount,
            }
          : event
      )
    );

    setEditingEventId(null);
    setMessage("Event updated successfully");
  } catch (error) {
    setMessage("Failed to update event");
  }
};

const createEvent = async () => {
  try {
    if (
      !createForm.title ||
      !createForm.date ||
      !createForm.location ||
      !createForm.capacity ||
      !organizerId
    ) {
      setMessage("Please fill all fields");
      return;
    }

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
        response.data.event.capacity -
        response.data.event.registeredCount,
    };

    setEvents([...events, newEvent]);

    setCreateForm({
      title: "",
      date: "",
      location: "",
      capacity: "",
    });

    setMessage("Event created successfully");
  } catch (error) {
    setMessage("Failed to create event");
  }
};

const deleteEvent = async (eventId) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this event?"
  );

  if (!confirmDelete) return;

  try {
    await axios.delete(
      `${API_URL}/organizer/${organizerId}/events/${eventId}`
    );

    setEvents(events.filter((event) => event._id !== eventId));

    setMessage("Event deleted successfully");
  } catch (error) {
    setMessage("Failed to delete event");
  }
};

  return (
    <div className="App">
      <h1>Organizer Dashboard</h1>

      <div className="form-box">
        <input
    type="text"
    value={organizerId}
    disabled
    />
        <button onClick={fetchOrganizerEvents}>Load My Events</button>
      </div>

      {message && <p className="message">{message}</p>}

      <div className="create-event-box">
  <h2>Create New Event</h2>

  <input
    type="text"
    placeholder="Title"
    value={createForm.title}
    onChange={(e) =>
      setCreateForm({ ...createForm, title: e.target.value })
    }
  />

  <input
    type="text"
    placeholder="Date"
    value={createForm.date}
    onChange={(e) =>
      setCreateForm({ ...createForm, date: e.target.value })
    }
  />

  <input
    type="text"
    placeholder="Location"
    value={createForm.location}
    onChange={(e) =>
      setCreateForm({ ...createForm, location: e.target.value })
    }
  />

  <input
    type="number"
    placeholder="Capacity"
    value={createForm.capacity}
    onChange={(e) =>
      setCreateForm({ ...createForm, capacity: e.target.value })
    }
  />

  <button onClick={createEvent}>Create Event</button>
</div>

      <div className="events-container">
        {events.map((event) => (
          <div key={event._id} className="event-card">
            {editingEventId === event._id ? (
  <div className="edit-box">
    <input
      type="text"
      value={editForm.title}
      onChange={(e) =>
        setEditForm({ ...editForm, title: e.target.value })
      }
    />

    <input
      type="text"
      value={editForm.date}
      onChange={(e) =>
        setEditForm({ ...editForm, date: e.target.value })
      }
    />

    <input
      type="text"
      value={editForm.location}
      onChange={(e) =>
        setEditForm({ ...editForm, location: e.target.value })
      }
    />

    <input
      type="number"
      value={editForm.capacity}
      onChange={(e) =>
        setEditForm({ ...editForm, capacity: e.target.value })
      }
    />

    <button onClick={() => saveEdit(event._id)}>Save</button>
    <button onClick={() => setEditingEventId(null)}>Cancel</button>
  </div>
) : (
  <>
    <h3>{event.title}</h3>
    <p>Date: {event.date}</p>
    <p>Location: {event.location}</p>
    <p>Capacity: {event.capacity}</p>
    <p>Registered: {event.registeredCount}</p>
    <p>Remaining seats: {event.remainingSeats}</p>

    <button onClick={() => startEditing(event)}>Edit Event</button>
    <button onClick={() => deleteEvent(event._id)}>Delete Event</button>
    <button onClick={() => fetchRegistrations(event._id)}>
      View Registrations
    </button>

    {registrations[event._id] && (
      <div className="registrations-box">
        <h4>Registrations</h4>
        {registrations[event._id].length === 0 ? (
          <p>No registrations yet.</p>
        ) : (
          registrations[event._id].map((reg) => (
  <div key={reg._id} className="registration-item">
    <p>Name: {reg.name}</p>
    <p>Email: {reg.email}</p>

    <button onClick={() => deleteRegistration(event._id, reg._id)}>
      Remove Participant
    </button>
  </div>
))
        )}
      </div>
    )}
  </>
)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrganizerDashboard;