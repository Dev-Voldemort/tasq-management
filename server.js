import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { generate } from "otp-generator";
import ejs, { render } from "ejs";
import { hash as _hash, compare } from "bcrypt";
const saltRounds = 10;

import { User, Manager, SubTask } from "./database/database.js";
import { sendOtp } from "./mail/otpValidation.js";

const app = express();

app.engine("html", ejs.renderFile);
app.use(express.urlencoded({ extended: true }));

app.get('/', function (req, res) {
  // res.status(200).send('Hello World');
  res.send({
    status_code: 200,
    message: "Hello World",
  })
})

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
app.post("/register", (req, res) => {
  const { firstName, lastName, userName, email, password, isManager } = req.body;

  let Model;
  if (isManager) Model = Manager;
  else Model = User;
  //Hash the password using a third-party library and a salt value. The callback function is executed once the hash is complete or an error occurs.
  _hash(password, saltRounds, async (err, hash) => {
    //Check if the user with the same email already exists in the database.
    console.log(req.body);
    const foundUser = await Model.findOneOne({ email: email });

    //If the email already exists and the user has not been verified, send a response with a status code of 206 and a message of "Email exists".
    if (foundUser && foundUser.isVerified) {
      res.status(206).send({ message: "Email already exists" });
    } else {
      //Generate a six-digit OTP (one-time password) using a third-party library and send it to the user's email address for verification.
      const otp = generate(6, { upperCase: false, specialChars: false });
      await sendOtp(req, res, "Verification OTP", otp);

      //Create a new user object using the data provided in the request body.
      const newUser = new Model({
        firstName: firstName,
        lastName: lastName,
        userName: userName,
        email: email,
        password: hash,
        users: [],
        totalTasks: 0,
        completeTasks: 0,
        otp: otp,
        isVerified: false,
      });

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

//This route handler handles a POST request to the "/validate-email" endpoint to validate the user's email and verify the OTP (one-time password) provided by the user.
app.post("/validate-email", async (req, res) => {
  //Extract the email and OTP from the request body.
  const { email, otp, isManager } = req.body;

  if (isManager) {
    //Find the user with the given email address in the database.
    const foundUser = await Manager.findOne({ email: email });

    //If the user is not found, send a response with a message of "User not found".
    if (!foundUser) {
      res.send("User not found");
    } else {
      //If the OTP matches the OTP stored in the user object, delete the OTP and mark the user as verified in the database.
      if (foundUser.otp === otp) {
        // deleting the otp and marking user as verified
        await Manager.updateOne(
          { email: email },
          { $set: { otp: "", isVerified: true } }
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
  } else {
    //Find the user with the given email address in the database.
    const foundUser = await User.findOne({ email: email });

    //If the user is not found, send a response with a message of "User not found".
    if (!foundUser) {
      res.send("User not found");
    } else {
      //If the OTP matches the OTP stored in the user object, delete the OTP and mark the user as verified in the database.
      if (foundUser.otp === otp) {
        // deleting the otp and marking user as verified
        await User.updateOne(
          { email: email },
          { $set: { otp: "", isVerified: true } }
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
  }
});

// This route handler handles a POST request to the "/login" endpoint to authenticate the user with their email and password.
app.post("/login", async function (req, res) {
  // Extract the email and password from the request body.
  const { email, password, isManager } = req.body;

  let Model;
  if (isManager) Model = Manager;
  else Model = User;
  try {
    // Find the user with the given email address in the database.
    const foundUser = await Model.findOne({ email: email });

    // If the user is found, check whether the user is verified.
    if (foundUser) {
      if (!foundUser.isVerified) {
        // If the user is not verified, send a response with a status code of 200 and a message of "User must verify the email".
        return res.send({
          message: "User must verify the email",
        });
      }

      // Compare the password provided by the user with the hashed password stored in the user object.
      const comparison = await compare(password, foundUser.password);

      // If the password matches, send a response with a status code of 200 and the user object.
      if (comparison) {
        return res.send({
          status_code: 200,
          Model: foundUser,
        });
      } else {
        // If the password does not match, send a response with a status code of 401 and a message of "Password does not match".
        return res.send({
          status_code: 401,
          message: "Password does not match",
        });
      }
    } else {
      // If the user is not found, send a response with a status code of 206 and a message of "User not found".
      return res.send({
        status_code: 206,
        message: "User not found",
      });
    }
  } catch (err) {
    // If an error occurs, send a response with a status code of 206 and the error message.
    return res.send({
      status_code: 206,
      message: err,
    });
  }
});

// Endpoint for handling forgot password requests
app.post("/forgot-password", async (req, res) => {
  const email = req.body.email;

  // Find the user associated with the given email
  const foundUser = await User.findOne({ email: email });

  // If the user is not found, return an error response
  if (!foundUser) {
    return res.status(404).send("User not found");
  }

  // Generate a 6-digit OTP for password reset
  const otp = generate(6, { upperCase: false, specialChars: false });

  // Send the OTP to the user's email address
  sendOtp(req, res, "Reset password OTP", otp);
});

app.post("/reset-password", async (req, res) => {
  // email, otp and password that came from front end
  const { email, otp, password } = req.body;

  // generate a hashed password from the plain text password
  _hash(password, saltRounds, async function (err, hash) {
    if (err) console.log("Reset Password: ", err);
    const newPassword = hash;
    try {
      // verify otp
      const found = await User.findOne({ email: email });

      // check if the OTP provided by the user matches the OTP in the database
      if (found.otp === otp) {
        // update the user's password with the new hashed password
        await User.findOneAndUpdate(
          { email: email },
          { password: newPassword }
        ).then(async () => {
          // delete the OTP from the user's record in the database
          await User.findOneAndUpdate({ email: email }, { otp: "" });
        });
        // res.send("Password updated successfully");
        res.send({
          status_code: 200,
          message: "Password updated successfully",
        });
      } else {
        // res.send("wrong otp");
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
  const { email, userEmail } = req.body;

  try {
    await Manager.findOneAndUpdate(
      { email: email },
      { $push: { users: { $each: [userEmail] } } }
    );
    res.send("User added successfully");
  } catch (err) {
    console.log("Error in adding user: ", err);
    res.status(500).json({ error: 'Error in adding user' });
  }
});

// app.get("/get-task", async (req, res) => {
//   const { email } = req.body;

//   try {
//     const foundUser = await Task.findMany({ email: email });
//     if(!foundUser) {
//       res.send("No tasks found")
//     }
//     else {
//       const subTask = await SubTask.findMany({task_id: foundUser._id});
//       res.send({foundUser,subTask});
//     }
//   }
//   catch(err) {
//     console.log(err);
//     res.send("Error getting the tasks");
//   }
// });

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
