const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Student = require('./models/Student');
const Attendance = require('./models/Attendance');

const app = express();

app.use(express.json());
app.use(cors());

mongoose.connect('mongodb://127.0.0.1:27017/attendanceDB')
  .then(() => console.log('MongoDB Connected ✅'))
  .catch(err => console.log(err));

app.get('/', (req, res) => {
  res.send('Server Running');
});

// ✅ GET all students
app.get('/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ IMPORTANT ROUTE
app.post('/add-student', async (req, res) => {
  console.log("API HIT 🔥"); // 👈 DEBUG LINE

  try {
    const { name, email, studentId } = req.body;

    const student = new Student({ name, email, studentId });
    await student.save();

    res.json({ message: "Student saved ✅" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/mark-attendance', async (req, res) => {
  try {
    const { studentId } = req.body;
    const today = new Date().toLocaleDateString();

    // 🔒 Check if already marked
    const existing = await Attendance.findOne({
      studentId,
      date: today
    });

    if (existing) {
      return res.status(400).json({
        message: "Attendance already marked today ⚠️"
      });
    }

    // ✅ Save new attendance
    const newAttendance = new Attendance({
      studentId,
      date: today,
      time: new Date().toLocaleTimeString(),
      status: "Present"
    });

    await newAttendance.save();

    res.json({
      message: "Attendance marked ✅",
      data: newAttendance
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => {
  console.log('Server running on port 5000 🚀');
});
