import dotenv from "dotenv";
dotenv.config();
import mongoose, { Mongoose } from "mongoose";

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Successfully connected to the database"))
  .catch((err) => {
    console.log("Error connecting to the database " + err);
  });

const userSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    designation: String,
    email: String,
    password: String,
    totalTasks: Number,
    completeTasks: Number,
    otp: String,
    isVerified: Boolean,
  },
  { versionKey: false }
);

const managerSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    firmName: String,
    designation: String,
    email: String,
    password: String,
    totalTasks: Number,
    users: [
      {
        _id: {type:String,autoCreate: false},
        email: String,
        designation: String,
      },
    ],
    otp: String,
    isVerified: Boolean,
  },
  { versionKey: false }
);

//? for personal tasks, status -> inProgress,completed,runningLate,aborted.
//? for org tasks, status -> assigned,inProgress,completed,approved,runningLate,underReview
const taskSchema = new mongoose.Schema(
  {
    _id: String,
    email: String,
    title: String,
    description: String,
    start: String,
    end: String,
    status: String, 
    isCompleted: Boolean,
    isPersonal: Boolean,
  },
  { versionKey: false }
);

//! Needs to be tested
//TODO: Make get,post routes
//TODO: @Rahul make task and remarks coordinate with each other
const remarkSchema = new mongoose.Schema(
  {
    remarks: [
      {
        //? for .get '_id' is required:
        task_id: String,
        email: String,
        message: String,
        dateTime: String,
      },
    ],
  },
  { versionKey: false }
);


const User = new mongoose.model("User", userSchema);
const Manager = new mongoose.model("Manager", managerSchema);
const Task = new mongoose.model("Task", taskSchema);
const Remarks = new mongoose.model("Remarks", remarkSchema);

export { User, Task, Manager, Remarks };
