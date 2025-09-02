// app.js
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const cookie = require("cookie-parser");
const flash = require("connect-flash");
const dotenv = require("dotenv");
const session = require("express-session");
const passport = require("passport");

const authMiddleware = require("./middleware/auth");

// Load env
dotenv.config();

const app = express();
const port = 4000;

// Views
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Core middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookie());
app.use(express.static(path.join(__dirname, "public")));

// Session (needed for OAuth handshake state)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // set true behind HTTPS in production
    },
  })
);

// Passport
app.use(passport.initialize());
// No passport.session() because we use JWT for logged-in state

// Load Passport strategies
require("./config/passport")(passport);

// JWT -> res.locals.user
app.use(authMiddleware);

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/home", require("./routes/home"));
app.use("/about", require("./routes/about"));
app.use("/contact", require("./routes/contact"));
app.use("/", require("./routes/user"));
app.use("/jobs", require("./routes/jobs"));


// Root
app.get("/", (req, res) => {
  res.render("home.ejs");
});

// MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Start
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
