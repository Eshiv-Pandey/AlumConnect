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
    console.error("Signup error:", err);
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
        "/login?mode=login&loginError=" +
          encodeURIComponent("Invalid credentials")
      );
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.redirect(
        "/login?mode=login&loginError=" +
          encodeURIComponent("Invalid credentials")
      );
    }

    signAndSetJwt(res, user, "local");
    return res.redirect("/home");
  } catch (err) {
    console.error("Login error:", err);
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
      // Don't reveal if user exists or not - just say check email
      return res.redirect(
        "/login?loginError=" + encodeURIComponent("If that email exists, we'll send a reset link")
      );
    }

    // Generate a random token (don't hash it yet)
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Hash the token before storing in database
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Store hashed token and expiry time
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour from now
    
    await user.save({ validateBeforeSave: false });

    // Create reset URL with unhashed token
    const resetURL = `${process.env.BASE_URL || "http://localhost:4000"}/auth/reset/${resetToken}`;

    console.log("Generated reset token:", resetToken);
    console.log("Hashed token stored:", hashedToken);
    console.log("Reset URL:", resetURL);
    console.log("Token expires at:", new Date(user.resetPasswordExpires));

    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"AlumConnect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset your AlumConnect password",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>Reset Your Password - AlumConnect</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
                table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
                img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
                body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0 !important; padding: 0 !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                .email-container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; }
                .email-card { background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15); }
                .email-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; position: relative; }
                .email-header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 20px; background: #ffffff; border-radius: 20px 20px 0 0; }
                .logo { display: inline-block; width: 80px; height: 80px; background: rgba(255, 255, 255, 0.2); border-radius: 50%; line-height: 80px; text-align: center; font-size: 36px; color: white; border: 3px solid rgba(255, 255, 255, 0.3); margin-bottom: 20px; }
                .brand-name { color: white; font-size: 32px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); }
                .email-body { padding: 40px 30px; }
                .greeting { font-size: 24px; font-weight: 600; color: #2c3e50; margin-bottom: 20px; text-align: center; }
                .message { font-size: 16px; line-height: 1.6; color: #6c757d; margin-bottom: 30px; text-align: center; }
                .cta-container { text-align: center; margin: 40px 0; }
                .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white !important; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-size: 18px; font-weight: 600; box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4); }
                .security-notice { background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1)); border-left: 4px solid #667eea; padding: 20px; border-radius: 8px; margin: 30px 0; }
                .security-title { font-size: 16px; font-weight: 600; color: #2c3e50; margin-bottom: 10px; }
                .security-text { font-size: 14px; color: #6c757d; line-height: 1.5; margin: 0; }
                .expiry-notice { text-align: center; margin: 30px 0 20px 0; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107; }
                .expiry-text { color: #856404; font-weight: 600; font-size: 14px; margin: 0; }
                .email-footer { background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
                .footer-text { font-size: 14px; color: #6c757d; line-height: 1.5; margin: 0 0 15px 0; }
                .footer-links { margin-top: 20px; }
                .footer-link { color: #667eea; text-decoration: none; font-size: 14px; margin: 0 15px; }
                .divider { height: 1px; background: linear-gradient(90deg, transparent, #e9ecef, transparent); margin: 30px 0; }
                @media only screen and (max-width: 600px) {
                    .email-container { padding: 20px 10px; }
                    .email-body { padding: 30px 20px; }
                    .email-footer { padding: 20px; }
                    .greeting { font-size: 20px; }
                    .brand-name { font-size: 28px; }
                    .logo { width: 60px; height: 60px; line-height: 60px; font-size: 24px; }
                    .cta-button { padding: 14px 28px; font-size: 16px; }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="email-card">
                    <div class="email-header">
                        <div class="logo">🎓</div>
                        <h1 class="brand-name">AlumConnect</h1>
                    </div>
                    
                    <div class="email-body">
                        <h2 class="greeting">Password Reset Request</h2>
                        <p class="message">
                            We received a request to reset the password for your AlumConnect account. 
                            If you made this request, click the button below to create a new password.
                        </p>
                        
                        <div class="cta-container">
                            <a href="${resetURL}" class="cta-button">Reset My Password</a>
                        </div>
                        
                        <div class="expiry-notice">
                            <p class="expiry-text">⏰ This link will expire in 1 hour for security reasons</p>
                        </div>
                        
                        <div class="security-notice">
                            <div class="security-title">🔒 Security Notice</div>
                            <p class="security-text">
                                If you didn't request a password reset, you can safely ignore this email. 
                                Your password will remain unchanged, and your account is secure.
                            </p>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <p class="message" style="font-size: 14px; color: #6c757d;">
                            If the button above doesn't work, copy and paste this link into your browser:<br>
                            <a href="${resetURL}" style="color: #667eea; word-break: break-all;">${resetURL}</a>
                        </p>
                    </div>
                    
                    <div class="email-footer">
                        <p class="footer-text">
                            This email was sent by AlumConnect. If you have any questions, 
                            please contact our support team.
                        </p>
                        
                        <div class="footer-links">
                            <a href="#" class="footer-link">Help Center</a>
                            <a href="#" class="footer-link">Contact Support</a>
                            <a href="#" class="footer-link">Privacy Policy</a>
                        </div>
                        
                        <p class="footer-text" style="margin-top: 20px; font-size: 12px;">
                            © ${new Date().getFullYear()} AlumConnect. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    });

    return res.redirect(
      "/login?loginError=" + encodeURIComponent("Check your email for the reset link")
    );
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.redirect(
      "/login?loginError=" + encodeURIComponent("Could not send reset email. Please try again.")
    );
  }
});

// ========== RESET PASSWORD ==========
// Show reset form
router.get("/reset/:token", async (req, res) => {
  try {
    const rawToken = req.params.token;
    console.log("Received reset token:", rawToken);
    
    // Hash the token from URL to match what's stored in database
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    console.log("Hashed token for lookup:", hashedToken);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    console.log("User found:", user ? `Yes (${user.email})` : "No");
    console.log("Current time:", new Date());
    console.log("Token expires:", user ? new Date(user.resetPasswordExpires) : "N/A");

    if (!user) {
      return res.redirect(
        "/login?loginError=" + encodeURIComponent("Reset link is invalid or has expired. Please request a new one.")
      );
    }

    // Render the reset password form
    res.render("reset.ejs", { 
      token: rawToken, 
      error: req.query.error || null 
    });
  } catch (err) {
    console.error("Reset form error:", err);
    res.redirect("/login?loginError=" + encodeURIComponent("Something went wrong. Please try again."));
  }
});

// Handle new password submission
router.post("/reset/:token", async (req, res) => {
  try {
    const rawToken = req.params.token;
    console.log("Processing password reset for token:", rawToken);
    
    // Hash the token from URL to match what's stored in database
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.redirect(
        "/login?loginError=" + encodeURIComponent("Reset link is invalid or has expired. Please request a new one.")
      );
    }

    const { newpass, confirmpass } = req.body;
    
    // Validate passwords
    if (!newpass || !confirmpass) {
      return res.redirect(`/auth/reset/${rawToken}?error=All fields are required`);
    }
    
    if (newpass !== confirmpass) {
      return res.redirect(`/auth/reset/${rawToken}?error=Passwords do not match`);
    }

    if (newpass.length < 8) {
      return res.redirect(`/auth/reset/${rawToken}?error=Password must be at least 8 characters long`);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newpass, 12);
    
    // Update user password and clear reset token fields
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save({ validateBeforeSave: false });

    console.log("Password successfully reset for user:", user.email);

    // Redirect to login with success message
    res.redirect("/login?loginError=" + encodeURIComponent("Password updated successfully! Please log in with your new password."));
  } catch (err) {
    console.error("Password reset error:", err);
    const rawToken = req.params.token;
    res.redirect(`/auth/reset/${rawToken}?error=Could not reset password. Please try again.`);
  }
});

module.exports = router;