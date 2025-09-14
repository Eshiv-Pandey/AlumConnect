// routes/university.js
const express = require("express");
const router = express.Router();
const University = require("../models/university"); // note lowercase filename you showed
const User = require("../models/User");
const auth = require("../middleware/auth");

/**
 * GET / (list universities)
 * Renders the page and passes:
 *  - universities: array of universities
 *  - joinedUniversities: array of uni ids that the logged-in user has joined (strings)
 *  - currentUser: req.user (the auth middleware object)
 */
router.get("/", auth, async (req, res) => {
  try {
    const universities = await University.find({}).lean();

    // find user's joined universities safely
    let joined = [];
    if (req.user && req.user.id) {
      const fullUser = await User.findById(req.user.id).select("universities").lean();
      joined = (fullUser?.universities || []).map(u => u.toString());
    }

    res.render("university.ejs", {
      universities,
      joinedUniversities: joined, // NOTE: matches the EJS variable name
      currentUser: req.user || null,
    });
  } catch (err) {
    console.error("Error fetching universities:", err);
    return res.status(500).send("Server error while fetching universities");
  }
});

/**
 * POST /:id/join
 * Joins the logged-in user to the university with id :id
 * Returns JSON:
 *  { success: true, alumnicount, studentcount }
 *  or { success: false, message }
 */
router.post("/:id/join", auth, async (req, res) => {
  try {
    console.log("JOIN ROUTE HIT:", { uniId: req.params.id, user: req.user || null });

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const uniId = req.params.id;
    const user = await User.findById(req.user.id);
    const university = await University.findById(uniId);

    if (!user) {
      console.warn("JOIN: user not found for id", req.user.id);
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!university) {
      console.warn("JOIN: university not found for id", uniId);
      return res.status(404).json({ success: false, message: "University not found" });
    }

    // ensure arrays exist
    if (!Array.isArray(user.universities)) user.universities = [];
    if (!Array.isArray(university.alumniMembers)) university.alumniMembers = [];
    if (!Array.isArray(university.studentMembers)) university.studentMembers = [];

    // already joined?
    const already = user.universities.some(u => u.toString() === uniId);
    if (already) {
      return res.status(400).json({ success: false, message: "Already a member" });
    }

    // update user
    user.universities.push(university._id);

    // update university members & counts
    if (user.role === "alumni") {
      if (!university.alumniMembers.some(m => m.toString() === user._id.toString())) {
        university.alumniMembers.push(user._id);
      }
      university.alumnicount = university.alumniMembers.length;
    } else {
      if (!university.studentMembers.some(m => m.toString() === user._id.toString())) {
        university.studentMembers.push(user._id);
      }
      university.studentcount = university.studentMembers.length;
    }

    await user.save();
    await university.save();

    console.log("JOIN SUCCESS:", { uniId, userId: user._id.toString() });

    return res.json({
      success: true,
      message: "Joined successfully",
      alumnicount: university.alumnicount,
      studentcount: university.studentcount,
    });
  } catch (err) {
    console.error("JOIN ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error while joining" });
  }
});

module.exports = router;
