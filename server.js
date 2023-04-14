require('dotenv').config()
const express = require('express');
const mysql = require('mysql');
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');


app.engine('html', require('ejs').renderFile);
app.use(bodyParser.urlencoded({ extended: true }));

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DBPASSWORD,
  database: 'taskdb'
});


db.connect((err) => {
  if (err) {
    throw err;
    console.log(err);
  }
  console.log('Connected to MySQL database');
});

app.get('/register', function(req, res){
  res.render('index.html');
});

app.get('/login', function(req, res){
  res.render('login.html')
})

app.get('/forgot-password', function(req, res){
  res.render('forgot-password.html')
})

app.get('/reset-password', function(req, res){
  res.render('reset-password.html')
})

app.post('/register', (req, res) => {

  bcrypt.hash(req.body.password, saltRounds, function(err, hash){
    const email = req.body.email;
    const password = hash;

    const query = `INSERT INTO user (email, password) VALUES ('${email}', '${password}')`;

    db.query(query, (err, result) => {
      if (err) {
        console.error('Error inserting user into MySQL database:', err);
        res.status(500).send('Error inserting user into MySQL database');
      } else {
        console.log('User inserted into MySQL database:', result);
        res.send('User registered successfully');
      }
    });
  });
});

app.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    const query = `SELECT * from taskdb.user WHERE email = '${email}'`;

    db.query(query, async (err, result, field) => {
      if (err) {
        res.send({
          "code": 200,
          "failed": "Error occured"
        })
      } else {
        // 2 cases here : 1) email not found, 2) password doesn't match
        // 1) redirect user to Register
        // 2) Password incorrect
        if(result.length>0){

        const comparision = await bcrypt.compare(password, result[0].password);
          if(comparision){
            console.log(result)
            res.send({
              "code": 200,
              "success": "Login Successful"
            })
          }
          else{
            res.send({
                       "code":204,
                       "success":"Email and password does not match"
                  })
          }
        }
        else{
          res.send({
            "code":206,
            "success":"Email does not exits"
              });
        }
      }
    });
  })

app.get('/users', (req, res) => {
  const sql = 'SELECT * FROM taskdb.user';
  db.query(sql, (err, result) => {
    if (err) {
      throw err;
    }
    res.send(result);
  });
});

// Endpoint concerned with handling forgot password requests
app.post("/forgot-password", async (req,res) => {
  const email = req.body.email;

  const query = `SELECT * from taskdb.user WHERE email = '${email}'`;

  db.query(query, (err,result) => {
    if(err) {
      console.log("No registered User was found with given Email");
      return res.status(400).send("not found");
    }
    if(result.length === 0) 
      return res.status(400).send("user not found");
  })

  const otp = otpGenerator.generate(6, { upperCase: false, specialChars: false });

  sqlQuery = `UPDATE taskdb.user SET otp = '${otp}' WHERE email='${email}'`;
  db.query(sqlQuery, (err, result)=>{
    if(err){
      console.log(err)
    }
  })
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
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
});

// Endpoint concerned with handling password reset requests via Otp verification
app.post("/reset-password", async (req,res) => {
  const { email, otp, password } = req.body;
  bcrypt.hash(password, saltRounds, function(err, hash){
    if(err) throw err;
    const newPassword = hash;
  try {
    // verify otp
    const qry = `SELECT otp from taskdb.user where email = '${email}'`;
    db.query(qry, async (err,ress) => {
      console.log(ress)
      if(err) throw err;
      else {
        if(ress[0].otp === otp) {

          db.query(`UPDATE user SET password = '${newPassword}' WHERE email='${email}'`, (req,result) => {
            if (err) throw err;
            else {
              console.log("Password updated successfully",result);
            }
          });

          //deleting Otp after updating password
          db.query(`UPDATE user SET otp = '' WHERE email='${email}'`);
          res.send("Password updated successfully");
        }
        else {
          res.send("wrong otp");
        }
      }
    });
  }
  catch(error) {
    console.log(error);
    res.status(401).send('OTP is invalid or has expired');
  }
})
});

const PORT = process.env.PORT || 3000;
app.listen(process.env.PORT, () => {
  console.log('Server started on port 3000');
});