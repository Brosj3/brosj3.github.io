const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

const User = require("./models/User");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Render login page
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/login.html");
});

// Handle login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) {
    return res.send("User not found");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.send("Wrong password");
  }

  res.send("Login successful");
});

// Create a test user (run once)
app.get("/create-user", async (req, res) => {
  const hashedPassword = await bcrypt.hash("12345", 10);

  const user = new User({
    username: "admin",
    password: hashedPassword
  });

  await user.save();
  res.send("User created");
});

app.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT);
});
