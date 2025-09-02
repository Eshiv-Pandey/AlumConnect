const express = require("express");
const router = express.Router();

//setting up About Us page
router.get("/", (req, res) => {
  res.render("AboutUs.ejs");
});

module.exports = router;
