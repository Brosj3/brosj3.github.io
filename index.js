const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// 🔐 MongoDB Atlas connection
mongoose.connect(
  "mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/mydb"
)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

// 👤 User schema
const UserSchema = new mongoose.Schema({
  username: String,
  password: String
});

const User = mongoose.model("User", UserSchema);

// 📝 Register
app.post("/register", async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const user = new User({
    username: req.body.username,
    password: hashedPassword
  });
  await user.save();
  res.send("User registered");
});

// 🔑 Login
app.post("/login", async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (!user) return res.status(400).send("User not found");

  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!valid) return res.status(400).send("Wrong password");

  res.send("Login successful");
});

app.listen(3000, () => console.log("Server running on port 3000"));
