// seedUniversity.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const University = require("./University"); // adjust path if needed

dotenv.config({ path: "../.env" });

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const universities = [
  {
    name: "Delhi University",
    location: "Delhi, India",
    about: "One of the premier universities in India, known for diverse programs and strong alumni network.",
    image: "",
    programs: ["Arts", "Science", "Commerce", "Engineering"],
    alumnicount: 0,
    studentcount: 0,
  },
  {
    name: "IIT Bombay",
    location: "Mumbai, India",
    about: "Top technical institute offering engineering, research, and management programs.",
    image: "",
    programs: ["Engineering", "Technology", "Management"],
    alumnicount: 0,
    studentcount: 0,
  },
  {
    name: "Jawaharlal Nehru University",
    location: "New Delhi, India",
    about: "Renowned for research in social sciences, sciences, and languages.",
    image: "",
    programs: ["Social Sciences", "Science", "Languages"],
    alumnicount: 0,
    studentcount: 0,
  },
  {
    name: "Banaras Hindu University",
    location: "Varanasi, India",
    about: "One of the largest residential universities in Asia with a wide variety of disciplines.",
    image: "https://images.unsplash.com/photo-1715075757390-a6abb6222d19?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTAxfHx1bml2ZXJzaXR5JTIwbG98ZW58MHx8MHx8fDA%3D",
    programs: ["Law", "Medicine", "Engineering", "Arts"],
    alumnicount: 0,
    studentcount: 0,
  },
  {
    name: "Indian Institute of Science",
    location: "Bangalore, India",
    about: "Premier institute dedicated to advanced scientific and technological research and education.",
    image: "",
    programs: ["Science", "Technology", "Research"],
    alumnicount: 0,
    studentcount: 0,
  },
];

async function seed() {
  try {
    await University.deleteMany({});
    await University.insertMany(universities);
    console.log("✅ Universities inserted successfully");
    mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error inserting universities:", err);
    mongoose.disconnect();
  }
}
seed();
