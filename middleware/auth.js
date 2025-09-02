// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function authMiddleware(req, res, next) {
  const token = req.cookies?.token;

  req.user = null;
  res.locals.user = { loggedIn: false };

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // (optional) check user still exists
    const user = await User.findById(decoded.id).lean();
    if (!user) {
      res.clearCookie("token", { path: "/" });
      return next();
    }

    const userData = {
      loggedIn: true,
      id: user._id,
      email: user.email,
      role: user.role || "student",
      name: user.name || null,
      provider: decoded.provider || "local",
    };

    req.user = userData;
    res.locals.user = userData;
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    res.clearCookie("token", { path: "/" });
  }

  next();
}

module.exports = authMiddleware;
