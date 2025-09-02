const express=require("express");
const router=express.Router();
const cookie=require("cookie-parser");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const User=require("../models/User.js");

router.use(cookie());

router.get("/login", (req, res) => {
  const error = req.query.error || null;
  res.render("login", { error });
});


router.post("/signup", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.redirect(
        "/login?mode=signup&error=" + encodeURIComponent("Email already registered!")
      );
    }

    const hash = await bcrypt.hash(password, 12);
    const newUser = new User({ email, password: hash, role });
    await newUser.save();

    // 🔑 Generate JWT
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 🍪 Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // only secure in production
      sameSite: "strict",
    });

    // Redirect to home logged in
    res.redirect("/home");
  } catch (err) {
    console.error(err);
    res.redirect(
      "/login?mode=signup&error=" + encodeURIComponent("Something went wrong, please try again.")
    );
  }
});



router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    let existingUser = await User.findOne({ email: email });
    if (!existingUser) {
      return res.redirect("/login?error=" + encodeURIComponent("Invalid email or password"));
    }

    bcrypt.compare(password, existingUser.password, (err, result) => {
      if (err) {
        console.log(err);
        return res.redirect("/login?error=" + encodeURIComponent("Something went wrong"));
      }

      if (result) {
        const token = jwt.sign(
          { email: existingUser.email, id: existingUser._id },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        res.cookie("token", token, {
          httpOnly: true,
          // secure: true,   // enable in production with HTTPS
          // sameSite: "strict"
        });

        return res.redirect("/home");
      } else {
        return res.redirect("/login?error=" + encodeURIComponent("Invalid email or password"));
      }
    });
  } catch (err) {
    console.log(err);
    res.redirect("/login?error=" + encodeURIComponent("Server error"));
  }
});

//logout route
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});
module.exports=router;

