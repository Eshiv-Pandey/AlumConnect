const express = require("express");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const router = express.Router();

// Helper: sign JWT + set cookie
function signAndSetJwt(res, user, provider = "local") {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role || "student",
      name: user.name || null,
      provider,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

// ========== LOGIN PAGE ==========
router.get("/login", (req, res) => {
  res.render("login", {
    loginError: req.query.loginError || null,
    signupError: req.query.signupError || null,
    mode: req.query.mode || "login", // active tab
  });
});

// ========== LOCAL SIGNUP ==========
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      return res.redirect(
        "/login?mode=signup&signupError=" +
          encodeURIComponent("Email & password are required")
      );
    }

    let existing = await User.findOne({ email });
    if (existing) {
      return res.redirect(
        "/login?mode=signup&signupError=" +
          encodeURIComponent("Email already registered")
      );
    }

    const hash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      password: hash,
      name: name || "",
      role: role || "student",
    });

    signAndSetJwt(res, user, "local");
    return res.redirect("/home");
  } catch (err) {
    console.error(err);
    return res.redirect(
      "/login?mode=signup&signupError=" +
        encodeURIComponent("Server error, please try again")
    );
  }
});

// ========== LOCAL LOGIN ==========
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.redirect(
        "/login?mode=login&loginError=" + encodeURIComponent("Invalid credentials")
      );
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.redirect(
        "/login?mode=login&loginError=" + encodeURIComponent("Invalid credentials")
      );
    }

    signAndSetJwt(res, user, "local");
    return res.redirect("/home");
  } catch (err) {
    console.error(err);
    return res.redirect(
      "/login?mode=login&loginError=" + encodeURIComponent("Server error")
    );
  }
});

// ========== GOOGLE OAUTH ==========
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  (req, res) => {
    signAndSetJwt(res, req.user, "google");
    res.redirect("/home");
  }
);

// ========== GITHUB OAUTH ==========
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"], session: false })
);

router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: "/login", session: false }),
  (req, res) => {
    signAndSetJwt(res, req.user, "github");
    res.redirect("/home");
  }
);

// ========== LOGOUT ==========
router.get("/logout", (req, res) => {
  res.clearCookie("token", { path: "/" });
  res.redirect("/login");
});

// ========== FORGOT PASSWORD ==========
router.get("/forgot", (req, res) => {
  res.render("forgot.ejs", { error: null });
});

router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.redirect(
        "/login?loginError=" + encodeURIComponent("Email is required")
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.redirect(
        "/login?loginError=" + encodeURIComponent("Check your email")
      );
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetURL =
      (process.env.BASE_URL || "http://localhost:4000") + `/auth/reset/${rawToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"AlumConnect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset your password",
      html: `<p>We received a request to reset your password.</p>
             <p><a href="${resetURL}">Click here to reset your password</a></p>
             <p>This link will expire in 1 hour.</p>`,
    });

    return res.redirect(
      "/login?loginError=" + encodeURIComponent("Check your email for reset link")
    );
  } catch (err) {
    console.error(err);
    return res.redirect(
      "/login?loginError=" +
        encodeURIComponent("Could not send reset email. Try again.")
    );
  }
});

// ========== RESET PASSWORD ==========

// Show reset form
router.get("/reset/:token", async (req, res) => {
  try {
    const rawToken = req.params.token;
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.redirect(
        "/login?loginError=" +
          encodeURIComponent("Reset link is invalid or expired")
      );
    }

    res.render("reset.ejs", { token: rawToken, error: req.query.error || null });
  } catch (err) {
    console.error(err);
    res.redirect("/login?loginError=" + encodeURIComponent("Something went wrong"));
  }
});

// Handle new password
router.post("/reset/:token", async (req, res) => {
  try {
    const rawToken = req.params.token;
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.redirect(
        "/login?loginError=" + encodeURIComponent("Reset link is invalid or expired")
      );
    }

    const { newpass, confirmpass } = req.body;
    if (!newpass || newpass !== confirmpass) {
      return res.redirect(`/auth/reset/${rawToken}?error=Passwords do not match`);
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newpass, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.redirect("/login?loginError=" + encodeURIComponent("Password updated! Please login"));
  } catch (err) {
    console.error(err);
    res.redirect("/login?loginError=" + encodeURIComponent("Could not reset password"));
  }
});

module.exports = router;
