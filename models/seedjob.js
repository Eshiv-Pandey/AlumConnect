require("dotenv").config({ path: "../.env" });

const mongoose = require("mongoose");
const Jobs = require("./jobs"); // path to your Jobs model

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch((err) => console.error("❌ MongoDB Connection Error:", err));


// Sample job data
const sampleJobs = [
  {
    title: "Frontend Developer",
    company: "TechCorp",
    location: "Remote",
    type: "Full-time",
    description: "Develop and maintain web applications using React and Tailwind.",
    skills: ["JavaScript", "React", "CSS", "Tailwind"]
  },
  {
    title: "Backend Developer",
    company: "DataWorks",
    location: "New York",
    type: "Full-time",
    description: "Work on APIs and databases using Node.js and MongoDB.",
    skills: ["Node.js", "Express", "MongoDB", "REST API"]
  },
  {
    title: "Machine Learning Engineer",
    company: "AI Innovators",
    location: "San Francisco",
    type: "Internship",
    description: "Build ML models and pipelines for real-world applications.",
    skills: ["Python", "TensorFlow", "Pandas", "Data Analysis"]
  }
];

// Insert jobs into collection
async function seedJobs() {
  try {
    await Jobs.insertMany(sampleJobs);
    console.log("✅ Sample jobs inserted successfully");
    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error inserting sample jobs:", error);
  }
}

seedJobs();
