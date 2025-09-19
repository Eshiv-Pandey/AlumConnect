const express = require("express");
const router = express.Router();
const sendMail = require("../mailer");

router.get("/", (req, res) => {
  const status = req.query.status; // read the status from query string
  res.render("AboutUs", { status }); // pass to EJS
});


router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    await sendMail(email, name, message);
    // redirect back with a success flag
    res.redirect("/contact?status=success");
  } catch (err) {
    console.error("❌ Failed to send mail:", err);
    // redirect back with an error flag
    res.redirect("/contact?status=error");
  }
});

module.exports = router;
