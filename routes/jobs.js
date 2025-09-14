const express=require("express");
const router=express.Router();
const Jobs=require("../models/jobs");

//setting up jobs route
router.get("/",async (req,res)=>{
  let jobs=await Jobs.find({});
  res.render("jobs.ejs",{jobs});
});   

module.exports=router;
