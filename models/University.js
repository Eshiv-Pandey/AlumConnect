// models/university.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const universitySchema = new Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  about: { type: String, required: true },
  image: { type: String },
  programs: { type: [String], required: true },

  // counts (kept for fast read) and lists (truth source)
  alumnicount: { type: Number, default: 0 },
  studentcount: { type: Number, default: 0 },
  alumniMembers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  studentMembers: [{ type: Schema.Types.ObjectId, ref: "User" }],
});

module.exports = mongoose.model("University", universitySchema);
