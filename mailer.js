const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  secure:true,
  port:465,
  auth: {
    user: process.env.EMAIL_USER, // match your .env
    pass: process.env.EMAIL_PASS,
  },
});

async function sendMail(senderEmail, name, message) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,      // now it reads from .env
      replyTo: senderEmail,
      subject:`Query from,${name}`,
      text: message,
    });
    return true;
  } catch (error) {
    console.error("❌ Mail error:", error.message);
    return false;
  }
}

module.exports = sendMail;
