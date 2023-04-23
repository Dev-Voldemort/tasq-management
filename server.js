import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { generate } from "otp-generator";
import ejs from "ejs";
import { hash as _hash, compare } from "bcrypt";
const saltRounds = 10;

import { User } from "./database/database.js";
import { sendOtp } from "./mail/otpValidation.js";

const app = express();

app.engine("html", ejs.renderFile);
app.use(express.urlencoded({ extended: true }));

app.get("/register", function (req, res) {
  res.render("register.html");
});

app.get("/login", function (req, res) {
  res.render("login.html");
});

app.get("/forgot-password", function (req, res) {
  res.render("forgot-password.html");
});

app.get("/reset-password", function (req, res) {
  res.render("reset-password.html");
});

app.post("/register", function (req, res) {
  _hash(req.body.password, saltRounds, async (err, hash) => {
    const found = await User.find({ email: req.body.email });

    if (found.length > 0 && req.body.isVerified === false) {
      res.send({
        status_code: 206,
        message: "Email exists",
      });
    } else {
      // storing the OTP in the database for Email validation
      const otp = generate(6, { upperCase: false, specialChars: false });
      await sendOtp(req, res, "Verification OTP", otp);

      const newUser = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        userName: req.body.userName,
        email: req.body.email,
        password: hash,
        totalTasks: 0,
        completeTasks: 0,
        otp: otp,
        isVerified: false,
      });

      // saving the registered user in database as non verified user
      newUser
        .save()
        .then(() =>
          res.send({
            status_code: 200,
            message: "User registered",
            body: {
              firstName: req.body.firstName,
              lastName: req.body.lastName,
              userName: req.body.userName,
              email: req.body.email,
              totalTasks: newUser.totalTasks,
              completeTasks: newUser.completeTasks,
              isVerified: newUser.isVerified,
            },
          })
        )
        .catch((err) => {
          console.log(err);
        });
    }
  });
});

// email validation and otp verification
app.post("/validate-email", async (req, res) => {
  const { email, otp } = req.body;
  const foundUser = await User.findOne({ email: email });

  if (!foundUser) {
    res.send("User not found");
  } else {
    if (foundUser.otp === otp) {
      // deleting the otp and marking user as verified
      await User.updateOne(
        { email: email },
        { $set: { otp: "", isVerified: true } }
      );
      res.send({
        status_code: 200,
        message: "Email has been verified successfully",
      });
    } else {
      res.send("wrong otp");
    }
  }
});

app.post("/login", async function (req, res) {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const foundUser = await User.findOne({ email: email });
    if (foundUser) {
      // checking whether the user is verified
      if(!foundUser.isVerified) {
        return res.send({
          message: "User must verify the email",
        });
      }

      const comparison = await compare(password, foundUser.password);

      if (comparison) {
        return res.send({
          status_code: 200,
          user: foundUser,
        });
      } else {
        return res.send({
          status_code: 401,
          message: "Password does not match",
        });
      }
    } else {
      return res.send({
        status_code: 206,
        message: "User not found",
      });
    }
  } catch (err) {
    return res.send({
      status_code: 206,
      message: err,
    });
  }
});

// Endpoint concerned with handling forgot password requests
app.post("/forgot-password", async (req, res) => {
  const email = req.body.email;
  const found = await User.findOne({ email: email });
  if (!found) {
    return res.status(500).send("User not found");
  }
  const otp = generate(6, { upperCase: false, specialChars: false });
  sendOtp(req, res, "Reset password OTP", otp);
});

app.post("/reset-password", async (req, res) => {
  // email, otp and password that came from front end
  const { email, otp, password } = req.body;

  _hash(password, saltRounds, async function (err, hash) {
    if (err) console.log("Reset Password: ", err);
    const newPassword = hash;
    try {
      // verify otp
      const found = await User.findOne({ email: email });
      if (found.otp === otp) {
        await User.findOneAndUpdate(
          { email: email },
          { password: newPassword }
        ).then(async () => {
          await User.findOneAndUpdate({ email: email }, { otp: "" });
        });
        res.send("Password updated successfully");
      } else {
        res.send("wrong otp");
      }
    } catch (error) {
      console.log(error);
      res.status(401).send("OTP is invalid or has expired");
    }
  });
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});




