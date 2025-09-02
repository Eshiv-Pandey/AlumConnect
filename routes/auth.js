// routes/auth.js
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

// ========== LOCAL SIGNUP ==========
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      return res.redirect(
        "/login?mode=signup&error=" + encodeURIComponent("Email & password are required")
      );
    }

    let existing = await User.findOne({ email });
    if (existing) {
      return res.redirect(
        "/login?mode=signup&error=" + encodeURIComponent("Email already registered")
      );
    }

    const hash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      password: hash,
      name: name || "",
      role: role || "student",
    });

    // Issue JWT cookie
    signAndSetJwt(res, user, "local");
    return res.redirect("/home");
  } catch (err) {
    console.error(err);
    return res.redirect(
      "/login?mode=signup&error=" + encodeURIComponent("Server error, please try again")
    );
  }
});

// ========== LOCAL LOGIN ==========
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.redirect("/login?error=" + encodeURIComponent("Invalid credentials"));
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.redirect("/login?error=" + encodeURIComponent("Invalid credentials"));
    }

    signAndSetJwt(res, user, "local");
    return res.redirect("/home");
  } catch (err) {
    console.error(err);
    return res.redirect("/login?error=" + encodeURIComponent("Server error"));
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
    // req.user is set by passport for this request
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

router.get("/forgot",(req,res)=>{
  res.render("forgot.ejs");
});

router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.redirect("/login?error=" + encodeURIComponent("Email is required"));

    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal that the user doesn't exist
      return res.redirect("/login?success=" + encodeURIComponent("Check your email"));
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
      html: `
        <p>We received a request to reset your password.</p>
        <p><a href="${resetURL}">Click here to reset your password</a></p>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    return res.redirect("/login?success=" + encodeURIComponent("Check your email"));
  } catch (err) {
    console.error(err);
    return res.redirect(
      "/login?error=" + encodeURIComponent("Could not send reset email. Try again.")
    );
  }
});

// ========== RESET PASSWORD PAGES (minimal) ==========
router.get("/reset/:token", async (req, res) => {
  const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.send(
      `<h3>Invalid or expired link</h3><a href="/login">Back to login</a>`
    );
  }

  // Simple inline form (replace with your EJS page if you prefer)
  res.send(`
    <form method="POST" action="/auth/reset/${req.params.token}" style="max-width:420px;margin:40px auto;">
      <h3>Set a new password</h3>
      <input type="password" name="password" placeholder="New password" required minlength="6" class="form-control" />
      <button type="submit" style="margin-top:12px">Update Password</button>
    </form>
  `);
});

router.post("/reset/:token", express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.redirect(
        "/login?error=" + encodeURIComponent("Invalid or expired reset link")
      );
    }

    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.redirect(
        `/auth/reset/${req.params.token}?error=` +
          encodeURIComponent("Password must be at least 6 characters")
      );
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Auto-login via JWT
    signAndSetJwt(res, user, "local");
    return res.redirect("/home");
  } catch (err) {
    console.error(err);
    return res.redirect("/login?error=" + encodeURIComponent("Server error"));
  }
});

module.exports = router;
