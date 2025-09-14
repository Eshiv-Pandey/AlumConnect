const express=require("express");
const router = express.Router();
const auth=require("../middleware/auth");
const User = require("../models/User");
const bcrypt=require("bcrypt");

router.get("/",auth,(req,res)=>{
  res.render("editpassword.ejs");
});

router.post("/",auth,async (req,res)=>{
  try{
    let {oldpass,newpass,confirmpass}=req.body;

   //1. Checking if all the fields are available or not
   if(!oldpass || !newpass || !confirmpass){
    return res.render("editpassword.ejs",{error: "All fields are required"});
   }

   //2. Checking if new password and old password are same or not
   if(newpass!==confirmpass){
    return res.render("editpassword.ejs",{error:"New Passwords do not match"});
   }

   //3. Getting the logged in User details
   const user=await User.findById(req.user.id);
   if(!user){
    return res.render("editpassword.ejs",{error:"User not found"});
   }
   // 3.1 Make sure user actually has a password
if (!user.password) {
  return res.render("editpassword.ejs", { error: "You don’t have a password set. Please use reset password instead." });
}

   //4. Verifying old password
   const isMatch=await bcrypt.compare(oldpass,user.password);
   if(!isMatch){
    return res.render("editpassword.ejs",{error:"Old Password is incorrect"});
   }

   //5. Hashing and updating new password
   const salt=await bcrypt.genSalt(10);
   user.password=await bcrypt.hash(newpass,salt);
   await user.save();

   return res.render("editpassword.ejs",{success : "Password Updated successfully"});
  }
   catch(err){
    return res.render("editpassword.ejs",{error:"Server error . Please try again later ."});
   }
});

module.exports=router;