const express = require("express");
const router = express.Router();
const sendMail = require("../mailer");

router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    await sendMail(email, name, message);
    res.send("✅ Your message has been sent successfully!");
  } catch (err) {
    console.error("❌ Failed to send mail:", err);
    res.status(500).send("Something went wrong. Please try again later.");
  }
});

module.exports = router;
