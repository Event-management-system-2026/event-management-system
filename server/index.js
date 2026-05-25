const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Registration = require("./models/Registration");
const Event = require("./models/Event");
const nodemailer = require("nodemailer");
const app = express();
const PORT = process.env.PORT || 5000;

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const users = [
  
  {
    username: "organizer1",
    password: "1234",
    role: "organizer",
    organizerId: "organizer1",
  },
  {
    username: "organizer2",
    password: "1234",
    role: "organizer",
    organizerId: "organizer2",
  },
];

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  })
);
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));



app.get("/", (req, res) => {
  res.send("EventFlow API is running");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({
      message: "Invalid username or password",
    });
  }

  res.json({
    message: "Login successful",
    user: {
      username: user.username,
      role: user.role,
      organizerId: user.organizerId || null,
    },
  });
});

app.get("/events", async (req, res) => {
  try {
    const events = await Event.find();

    const eventsWithRemainingSeats = events.map((event) => ({
      ...event.toObject(),
      remainingSeats: event.capacity - event.registeredCount,
    }));

    res.json(eventsWithRemainingSeats);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch events",
      error: error.message,
    });
  }
});

app.post("/events", async (req, res) => {
  try {
    const { title, date, location, capacity, organizerId } = req.body;

    if (!title || !date || !location || !capacity || !organizerId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const event = new Event({
      title,
      date,
      location,
      capacity,
      organizerId,
    });

    await event.save();

    res.status(201).json({
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create event",
      error: error.message,
    });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, eventId } = req.body;

    if (!name || !email || !eventId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.registeredCount >= event.capacity) {
      return res.status(400).json({ message: "Event is full" });
    }

    const newRegistration = new Registration({
      name,
      email,
      eventId,
    });

    await newRegistration.save();

    event.registeredCount += 1;
    await event.save();

    try {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "EventFlow - Registration Successful",
    text: `Hello ${name},

You have successfully registered for the event: ${event.title}.

Thank you,
EventFlow Team`,
  });

  console.log("Email sent successfully");
} catch (emailError) {
  console.log("Email sending failed:", emailError.message);
}

    res.status(201).json({
      message: "Registration successful",
      registration: newRegistration,
      remainingSeats: event.capacity - event.registeredCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
});

app.get("/organizer/:organizerId/events", async (req, res) => {
  try {
    const { organizerId } = req.params;

    const events = await Event.find({ organizerId });

    const eventsWithRemainingSeats = events.map((event) => ({
      ...event.toObject(),
      remainingSeats: event.capacity - event.registeredCount,
    }));

    res.json(eventsWithRemainingSeats);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch organizer events",
      error: error.message,
    });
  }
});

app.put("/organizer/:organizerId/events/:eventId", async (req, res) => {
  try {
    const { organizerId, eventId } = req.params;
    const { title, date, location, capacity } = req.body;

    const event = await Event.findOne({ _id: eventId, organizerId });

    if (!event) {
      return res.status(403).json({
        message: "You are not allowed to edit this event",
      });
    }

    if (title) event.title = title;
    if (date) event.date = date;
    if (location) event.location = location;
    if (capacity) event.capacity = capacity;

    await event.save();

    res.json({
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update event",
      error: error.message,
    });
  }
});

app.delete("/organizer/:organizerId/events/:eventId", async (req, res) => {
  try {
    const { organizerId, eventId } = req.params;

    const event = await Event.findOne({
      _id: eventId,
      organizerId,
    });

    if (!event) {
      return res.status(403).json({
        message: "You are not allowed to delete this event",
      });
    }

    await Registration.deleteMany({ eventId });

    await Event.findByIdAndDelete(eventId);

    res.json({
      message: "Event deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete event",
      error: error.message,
    });
  }
});

app.delete(
  "/organizer/:organizerId/events/:eventId/registrations/:registrationId",
  async (req, res) => {
    try {
      const { organizerId, eventId, registrationId } = req.params;

      const event = await Event.findOne({ _id: eventId, organizerId });

      if (!event) {
        return res.status(403).json({
          message: "You are not allowed to manage this event",
        });
      }

      const registration = await Registration.findOne({
        _id: registrationId,
        eventId,
      });

      if (!registration) {
        return res.status(404).json({
          message: "Registration not found",
        });
      }

      await Registration.findByIdAndDelete(registrationId);

      if (event.registeredCount > 0) {
        event.registeredCount -= 1;
        await event.save();
      }

      res.json({
        message: "Participant removed successfully",
        remainingSeats: event.capacity - event.registeredCount,
        registeredCount: event.registeredCount,
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to remove participant",
        error: error.message,
      });
    }
  }
);

app.get("/organizer/:organizerId/events/:eventId/registrations", async (req, res) => {
  try {
    const { organizerId, eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, organizerId });

    if (!event) {
      return res.status(403).json({
        message: "You are not allowed to view this event",
      });
    }

    const registrations = await Registration.find({ eventId });

    res.json(registrations);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch registrations",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
