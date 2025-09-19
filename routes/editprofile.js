const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

// ✅ GET edit profile page
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    res.render("editprofile.ejs", { user });
  } catch (err) {
    console.error("Edit profile load error:", err);
    res.status(500).send("Server error");
  }
});

// ✅ POST edit profile (update name, email, role)
router.post("/", auth, async (req, res) => {
  try {
    const { name, email, role } = req.body;

    await User.findByIdAndUpdate(req.user.id, {
      name: name?.trim(),
      email: email?.trim(),
      role,
    });

    res.redirect("/profile");
  } catch (err) {
    console.error("Edit profile save error:", err);
    res.status(500).send("Server error");
  }
});

module.exports=router;

