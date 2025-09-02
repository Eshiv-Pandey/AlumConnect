const mongoose=require("mongoose");
const Schema= mongoose.Schema;

const jobsSchema=new Schema({
  title:{
    type:String,required:true,
  },
  company:{
    type:String,required:true,
  },
  location:{
    type:String,required:true,
  },
  type:{
    type:String,required:true,
  },
  description:{
    type:String,required:true,
  },
  skills:{
    type:[String],required:true,
  }
});

const Jobs=mongoose.model("Jobs",jobsSchema);
module.exports=Jobs;