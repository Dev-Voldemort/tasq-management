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
    email: String,
    password: String,
    firmName: String,
    designation: String,
    profilePicture: String,
    totalTasks: Number,
    // profilePicture: String,
    completeTasks: Number,
    otp: String,
    isVerified: Boolean,
  },
  { versionKey: false },
  { typeKey: '$type' }

);

const managerSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: String,
    password: String,
    firmName: String,
    designation: String,
    profilePicture: String,
    totalTasks: Number,
    users: [
      {
        _id: { type: String, autoCreate: false },
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
    email: String,
    title: String,
    description: String,
    start: String,
    end: String,
    status: String,
    lastRemark: {
      _id: { type: String, autoCreate: false },
        email: String,
        message: String,
        dateTime: String,
    },
    isCompleted: Boolean,
    isPersonal: Boolean,
  },
  { versionKey: false }
);

const remarkSchema = new mongoose.Schema(
  {
    //? for .get '_id' is required:
    _id: { type: String, autoCreate: false },
    task_id: String,
    remarks: [
      {
        _id: { type: String, autoCreate: false },
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
const Remark = new mongoose.model("Remarks", remarkSchema);

export { User, Task, Manager, Remark };
