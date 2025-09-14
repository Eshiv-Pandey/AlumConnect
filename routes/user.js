const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ===== GET LOGIN PAGE =====
router.get("/login", (req, res) => {
  res.render("login", {
    loginError: req.query.loginError || null,
    signupError: req.query.signupError || null,
    mode: req.query.mode || "login",
  });
});

// ===== SIGNUP =====
router.post("/signup", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.redirect(
        "/login?mode=signup&signupError=" +
          encodeURIComponent("All fields are required")
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.redirect(
        "/login?mode=signup&signupError=" +
          encodeURIComponent("Email already registered")
      );
    }

    const hash = await bcrypt.hash(password, 12);
    const newUser = new User({ email, password: hash, role });
    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.redirect("/home");
  } catch (err) {
    console.error(err);
    res.redirect(
      "/login?mode=signup&signupError=" +
        encodeURIComponent("Something went wrong")
    );
  }
});

// ===== LOGIN =====
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.redirect(
        "/login?mode=login&loginError=" +
          encodeURIComponent("Invalid email or password")
      );
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.redirect(
        "/login?mode=login&loginError=" +
          encodeURIComponent("Invalid email or password")
      );
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.redirect("/home");
  } catch (err) {
    console.error(err);
    res.redirect(
      "/login?mode=login&loginError=" +
        encodeURIComponent("Server error")
    );
  }
});

router.get("/forgot",(req,res)=>{
  res.render("forgot.ejs");
});
// ===== LOGOUT =====
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

module.exports = router;
