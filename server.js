import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import { connect, Schema, model } from "mongoose";
import { hash as _hash, compare } from "bcrypt";
const saltRounds = 10;
import { createTransport } from 'nodemailer';
import { generate } from 'otp-generator';
import ejs from 'ejs';

const app = express();

app.engine('html', ejs.renderFile);
app.use(express.urlencoded({ extended: true }));

connect(
  "mongodb://127.0.0.1:27017/taskDB",
  { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Successsfully connected to the database"))
  .catch((err) => { console.log(err); });

const userSchema = new Schema({
  firstName: String,
  lastName: String,
  userName: String,
  email: String,
  password: String,
  totalTasks: Number,
  completeTasks: Number,
  otp: String
});

const taskSchema = new Schema({
  _id: String,
  email: String,
  description: String,
  start: String,
  end: String,
  subTasks: String,
  status: String,
  isCompleted: Boolean,
  priority: Boolean,
});

const subTaskSchema = new Schema({
  _id: String,
  task_id: String,
  subDescription: String,
  isComplete: Boolean, 
});

const User = new model("User", userSchema);
const Task = new model("Task", taskSchema);


app.get('/register', function (req, res) {
  res.render('register.html');
})

app.get('/login', function (req, res) {
  res.render('login.html');
})

app.get('/forgot-password', function(req, res){
  res.render('forgot-password.html')
})

app.get('/reset-password', function(req, res){
  res.render('reset-password.html')
})

app.post('/register', function (req, res) {
  _hash(req.body.password, saltRounds, async (err, hash) => {
    const found = await User.find({ email: req.body.email });
    if (found.length > 0) {
      res.send({
        "status_code": 206,
        "failure": "Email exits"
      });
    }
    else {
      const newUser = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        userName: req.body.userName,
        email: req.body.email,
        password: hash,
        totalTasks: 0,
        completeTasks: 0,
        otp: ''
      });
      
      newUser.save()
      .then(() => 
        res.send("Register")
      )
      .catch((err) => { 
        console.log(err); 
      });0
    }
  });
});
app.post('/login', async function (req, res) {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const foundUser = await User.findOne({ email: email });
    if (foundUser) {
      const comparision = await compare(password, foundUser.password);
      console.log("Compa: ", comparision)
      console.log("Pass", password)

      if (comparision) {
        console.log("Matches");
        res.send({
          "code": 200,
          "message": "Success"
        });
      }
      else {
        res.send({"code": 401,
         "meassage": "Password does not match"
        });
      }
    }
    else {
      res.send({"code": 206,
       "meassge": 'User not found'
      });
    }
  }
  catch {
    res.send({"code": 206,
     "message": "user not found"
    });
  }
});

// Endpoint concerned with handling forgot password requests
app.post("/forgot-password", async (req, res) => {
  const email = req.body.email;
  const found = await User.findOne({email: email});
  if(!found) {
    return res.status(500).send('User not found');
  }
  try {
    const otp = generate(6, { upperCase: false, specialChars: false });
    const addOtp = await User.findOneAndUpdate({ email: email }, { otp: otp })

    const transporter = createTransport({
      service: 'gmail',
      secure: false,
      auth: {
        // this username and password is the one from which email will be sent
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Reset your password',
      text: `Your password reset OTP is ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send('Failed to send email');
      }
      console.log('Email sent: ' + info.response);
      res.send('Password reset OTP sent');
    });
  }
  catch {
    res.send("User not found");
  }
});

app.post("/reset-password", async (req,res) => {
  const { email, otp, password } = req.body;
  _hash(password, saltRounds, async function(err, hash){
    if(err) throw err;
    const newPassword = hash;
    try {
      // verify otp
      const found = await User.findOne({email: email});
      if(found.otp === otp) {
        
        await User.findOneAndUpdate({email: email}, {password: newPassword})
          .then(async () => {
            await User.findOneAndUpdate({email: email}, {otp: ''})
            console.log("Password updated successfully");
          });
          res.send("Password updated successfully");
      }
      else {
        res.send("wrong otp");
      }
    }
    catch(error) {
      console.log(error);
      res.status(401).send('OTP is invalid or has expired');
    }
  });
});

app.get("/get-task", async (req, res) => {
  const email = req.body.email;
  const found = await Task.findOne({email: email});
  console.log(found)

  if(found) {
    console.log(123);
    res.send(found);
  }
  else {
    res.send("User does not exists!");
  }
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});




