// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.githubId;
      },
      minlength: [6, "Password must be at least 6 characters long"],
    },
    role: {
      type: String,
      enum: ["student", "alumni", "admin"],
      default: "student",
    },
    name: { type: String, trim: true },

    //  Changed: allow multiple universities as per our requirements
    universities: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "University" }],
      default: []
    }
    ,

    googleId: { type: String, index: true, sparse: true },
    githubId: { type: String, index: true, sparse: true },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
