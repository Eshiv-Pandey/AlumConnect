// routes/profile.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.redirect(
        "/auth/login?loginError=" +
          encodeURIComponent("Please log in to view your profile")
      );
    }

    const userId = req.user.id;

    // ✅ Populate universities fully
    const user = await User.findById(userId)
      .populate("universities", "name location about") 
      .lean();

    if (!user) {
      res.clearCookie("token", { path: "/" });
      return res.redirect(
        "/auth/login?loginError=" +
          encodeURIComponent("User not found")
      );
    }

    const joinDate = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "N/A";

    res.render("profile.ejs", {
      profileUser: {
        ...user,
        joinDate,
      },
    });
  } catch (err) {
    console.error("Profile route error:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
