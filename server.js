//! change statusCode style

import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { generate } from "otp-generator";
import ejs, { render } from "ejs";
import { hash as _hash, compare } from "bcrypt";
import bcrypt from "bcrypt";
const saltRounds = 10;

import { User, Manager } from "./database/database.js";
import { sendOtp } from "./mail/otpValidation.js";

const app = express();

app.engine("html", ejs.renderFile);
app.use(express.urlencoded({ extended: true }));

app.get("/", function (req, res) {
  res.status(200).send("Hello World");
});

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

app.get("/add-user", function (req, res) {
  res.render("add-user.html");
});

// This route handler handles a POST request to the "/register" endpoint to register a new user.
app.post("/register", async (req, res) => {
  const {
    firstName,
    lastName,
    userName,
    email,
    password,
    isManager,
    firmName,
    designation,
  } = req.body;

  let Model;
  if (isManager) {
    Model = Manager;
  } else if (!isManager) Model = User;
  //Hash the password using a third-party library and a salt value. The callback function is executed once the hash is complete or an error occurs.
  _hash(password, saltRounds, async (err, hash) => {
    //Check if the user with the same email already exists in the database.
    console.log(req.body);
    const foundUser = await Model.findOne({ email: email });

    //If the email already exists and the user has not been verified, send a response with a status code of 206 and a message of "Email exists".
    if (foundUser) {
      if (!foundUser.isVerified) {
        return res.status(206).send({ message: "User must verify the email" });
      } else res.status(206).send({ message: "Email already exists" });
    } else {
      //Generate a six-digit OTP (one-time password) using a third-party library and send it to the user's email address for verification.
      const otp = generate(6, { upperCase: false, specialChars: false });
      const msg = `Your OTP  for Email verification is ${otp}`;
      const subject = "Verification OTP";
      await sendOtp(req, res, subject, msg, otp);

      //Create a new user object using the data provided in the request body.
      let newUser;
      if (isManager) {
        newUser = new Model({
          firstName: firstName,
          lastName: lastName,
          userName: userName,
          email: email,
          firmName: firmName,
          designation: designation,
          password: hash,
          users: [],
          totalTasks: 0,
          otp: otp,
          isVerified: false,
        });
      } else if (!isManager) {
        newUser = new Model({
          firstName: firstName,
          lastName: lastName,
          userName: userName,
          designation: designation,
          email: email,
          password: hash,
          totalTasks: 0,
          completeTasks: 0,
          otp: otp,
          isVerified: false,
        });
      }

      //Save the newly created user object to the database as a non-verified user.
      newUser
        .save()
        .then(() =>
          //If the user is successfully saved to the database, send a response with a status code of 200 and a message of "User registered" along with the user object as the response body.
          res.send({
            status_code: 200,
            message: "User registered",
            body: {
              user: newUser,
            },
          })
        )
        .catch((err) => {
          //If there is an error while saving the user object to the database, log the error to the console.
          console.error(err);
          return res.status(500).json({
            message: "Internal server error",
          });
        });
    }
  });
});

//! Optimize code
//This route handler handles a POST request to the "/validate-email" endpoint to validate the user's email and verify the OTP (one-time password) provided by the user.
app.post("/validate-email", async (req, res) => {
  //Extract the email and OTP from the request body.
  const { email, otp, isManager } = req.body;

  let Model;
  if (isManager) {
    Model = Manager;
  } else if (!isManager) Model = User;

  try {
    //Find the user with the given email address in the database.
    const foundUser = await Model.findOne({ email: email });

    //If the user is not found, send a response with a message of "User not found".
    if (!foundUser) {
      res.send("User not found");
    } else {
      //If the OTP matches the OTP stored in the user object, delete the OTP and mark the user as verified in the database.
      if (foundUser.otp === otp) {
        // deleting the otp and marking user as verified
        await Model.updateOne(
          { email: email },
          { $set: { otp: null, isVerified: true } }
        );
        //Send a response with a status code of 200 and a message of "Email has been verified successfully".
        res.send({
          status_code: 200,
          message: "Email has been verified successfully",
        });
      } else {
        //If the OTP does not match the OTP stored in the user object, send a response with a message of "wrong otp".
        res.send("wrong otp");
      }
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/login", async function (req, res) {
  const { email, password, isManager } = req.body;

  let Model;
  if (isManager) {
    Model = Manager;
  } else if (!isManager) Model = User;

  _hash(password, saltRounds, async (err, hash) => {
    if (err) console.log(err);
    try {
      const foundUser = await Model.findOne({ email: email });

      if (foundUser) {
        if (!foundUser.isVerified) {
          return res.send({
            status_code: 402,
            message: "User must verify the email",
          });
        }

        const comparison = await compare(password, foundUser.password);
        if (comparison) {
          return res.send({
            status_code: 200,
            Model: foundUser,
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
      console.log("login - catch error = ", err);
      return res.send({
        status_code: 206,
        message: err,
      });
    }
  });
});

// Endpoint for handling forgot password requests
//! use it for org-user login as well
app.post("/forgot-password", async (req, res) => {
  const { email, isManager } = req.body;
  let Model;
  if (isManager) {
    Model = Manager;
  } else if (!isManager) Model = User;

  // Find the user associated with the given email
  const foundUser = await Model.findOne({ email: email });
  // If the user is not found, return an error response
  if (!foundUser) {
    return res.status(404).send("User not found");
  }

  // Generate a 6-digit OTP for password reset
  const otp = generate(6, { upperCase: false, specialChars: false });

  // Send the OTP to the user's email address
  //TODO change according to sendOtp structure
  const msg = `Your OTP for password reset is ${otp}`;
  const subject = "Reset password OTP";
  await sendOtp(req, res, subject, msg, otp);
  await Model.updateOne({ email: email }, { $set: { otp: otp } });
});

app.post("/reset-password", async (req, res) => {
  // email, otp and password that came from front end
  const { email, otp, password, isManager } = req.body;
  console.log("isMana:", isManager);
  let Model;
  if (isManager) {
    Model = Manager;
  } else if (!isManager) Model = User;

  console.log("model:", Model);
  // generate a hashed password from the plain text password
  _hash(password, saltRounds, async (err, hash) => {
    try {
      // verify otp
      const found = await Model.findOne({ email: email });

      // check if the OTP provided by the user matches the OTP in the database
      if (found.otp === otp) {
        // update the user's password with the new hashed password
        await Model.findOneAndUpdate(
          { email: email },
          { password: hash }
        ).then(async () => {
          // delete the OTP from the user's record in the database
          await Model.findOneAndUpdate({ email: email }, { otp: null });
        });
        // res.send("Password updated successfully");
        res.send({
          status_code: 200,
          message: "Password updated successfully",
        });
      } else {
        res.send({
          status_code: 401,
          message: "Wrong otp",
        });
      }
    } catch (error) {
      console.log(error);
      // res.status(401).send("OTP is invalid or has expired");
      res.send({
        status_code: 401,
        message: "OTP is invalid or has expired",
      });
    }
  });
});

app.post("/add-user", async (req, res) => {
  //TODO: add assignee email and designation -> through which user must reg/login
  const { managerEmail, email, emailTo, designation, note } = req.body;
  const userPassword = generate(10, { upperCase: true, specialChars: true });

  //* [subject] = subject of the email:
  //TODO: make poetic messageMail:
  const subject = "Login credentials";
  const message = `Hey ${firstName} ${lastName}, Your official email is ${emailTo} and password is ${userPassword}. You are now ${designation}. ${note}`;
  // const message = `Your official email is ${emailTo} and password is ${userPassword}. You are now ${designation}. Welcome Remarks: ${note}`;
  await sendOtp(req, res, subject, message);

  const addObject = {
    emailTo: emailTo,
    designation: designation,
  }
  try {
    const foundManager = await Manager.findOne({ email: managerEmail });

    const users = [...foundManager.users, addObject];
    await Manager.updateOne(
      { email: managerEmail },
      { $set: { users: users } }
    );
    res.send("User added successfully");
  } catch (err) {
    console.log("Error in adding user: ", err);
    res.status(500).json({ error: "Error in adding user" });
  }
});

app.get("/get-task", async (req, res) => {
  const { email, isPersonal } = req.body;

  try {
    const foundTasks = await Task.find({ email: email, isPersonal: isPersonal });
    if (!foundTasks) {
      res.send("No tasks found");
    } else {
      res.send({
        tasks: foundTasks,
      });
    }
  } catch (err) {
    console.log(err);
    res.send("Error getting the tasks");
  }
});

app.post("/add-task", async (req, res) => {
  const { email, title, description, start, end, isPersonal } = req.body;

  try {
    const newTask = new Task({
      email: email,
      title: title,
      description: description,
      start: start,
      end: end,
      status: "assigned", // assigned,inProgress,completed,approved,runningLate
      isCompleted: false,
      isPersonal: isPersonal,
    });

    await newTask.save();
    res.send({
      status_code: 200,
      message: "Task added successfully",
    });
  } catch (err) {
    console.log(err);
  }
});

//TODO: check how to update whole JSON object in findOneAndUpdate
app.post("/edit-task", async (req, res) => {
  const {
    _id,
    email,
    title,
    description,
    start,
    end,
    status,
    isCompleted,
    isPersonal,
  } = req.body;
  try {
    await Task.findOneAndUpdate(
      { _id: _id },
      {
        _id: _id,
        email: email,
        title: title,
        description: description,
        start: start,
        end: end,
        status: status,
        isCompleted: isCompleted,
        isPersonal: isPersonal,
      }
    );
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
