import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

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
    userName: String,
    email: String,
    password: String,
    totalTasks: Number,
    completeTasks: Number,
    otp: String,
    isVerified: Boolean,
  },
  { versionKey: false }
);

const taskSchema = new mongoose.Schema(
  {
    email: String,
    description: String,
    start: String,
    end: String,
    subTasks: String,
    status: String,
    isCompleted: Boolean,
    priority: Boolean,
  },
  { versionKey: false }
);

const subTaskSchema = new mongoose.Schema(
  {
    task_id: String,
    subDescription: String,
    isComplete: Boolean,
  },
  { versionKey: false }
);

const User = new mongoose.model("User", userSchema);
const Task = new mongoose.model("Task", taskSchema);

export { User, Task };
