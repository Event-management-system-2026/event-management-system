const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Registration = require("./models/Registration");

const app = express();
const PORT = process.env.PORT || 5000;

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

const events = [
  {
    id: 1,
    title: "Tech Conference 2026",
    date: "2026-06-10",
    location: "Nazareth",
    capacity: 100,
  },
  {
    id: 2,
    title: "Startup Meetup",
    date: "2026-06-15",
    location: "Haifa",
    capacity: 50,
  },
  {
    id: 3,
    title: "AI Workshop",
    date: "2026-06-20",
    location: "Tel Aviv",
    capacity: 30,
  },
];

app.get("/", (req, res) => {
  res.send("EventFlow API is running");
});

app.get("/events", (req, res) => {
  res.json(events);
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, eventId } = req.body;

    if (!name || !email || !eventId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newRegistration = new Registration({
      name,
      email,
      eventId,
    });

    await newRegistration.save();

    res.status(201).json({
      message: "Registration successful",
      registration: newRegistration,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});