const mongoose=require("mongoose");
const Schema=mongoose.Schema;

const universitySchema=new Schema({
  name:{type:String,required:true},
  location:{type:String,required:true},
  about:{type:String,required:true},
  image:{type:String,},
  programs:{type:[String],required:true},
  alumnicount:{type:Number},
  studentcount:{type:Number},
});

module.exports=mongoose.model("University",universitySchema);