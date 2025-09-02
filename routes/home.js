const express=require("express");
const router =express.Router();

//setting up home page
router.get("/",(req,res)=>{
  res.render("home.ejs");
});

module.exports=router;