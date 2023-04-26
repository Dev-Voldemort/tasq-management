import dotenv from "dotenv";
dotenv.config();
import { createTransport } from "nodemailer";
import { User } from "../database/database.js";

async function sendOtp(req, res, message, otp) {
  const email = req.body.email;
  try {
    await User.findOneAndUpdate({ email: email }, { otp: otp });

    const transporter = createTransport({
      service: "gmail",
      secure: false,
      auth: {
        // this username and password is the one from which email will be sent
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: message,
      text: `Your OTP is ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send("Failed to send email");
      }
      console.log("Email sent: " + info.response);
      // res.send("OTP sent successfully!");
      return res.send({
        status_code: 200,
        message: "OTP sent successfully!",
      })
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Failed to send OTP email");
  }
}

export { sendOtp };
