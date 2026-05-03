const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendanceDB';
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

app.use(cors());
app.use(express.json());

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getTimeKey = (date = new Date()) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};

const isValidDateKey = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date);

const normalizeStudentPayload = ({ name, email, studentId }) => ({
  name: name?.trim(),
  email: email?.trim().toLowerCase(),
  studentId: studentId?.trim()
});

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      studentId: user.studentId || ''
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  studentId: user.studentId || ''
});

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);

    if (!user) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};

app.get('/', (req, res) => {
  res.json({ message: 'Smart Attendance System API is running' });
});

app.post('/auth/register', async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const role = req.body.role;
    const studentId = req.body.studentId?.trim() || '';

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or user' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    if (role === 'user') {
      if (!studentId) {
        return res.status(400).json({ message: 'studentId is required for user accounts' });
      }

      const student = await Student.findOne({ studentId });
      if (!student) {
        return res.status(404).json({ message: 'Student profile not found. Ask admin to add the student first.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      studentId: role === 'user' ? studentId : ''
    });

    await user.save();

    res.status(201).json({
      message: 'Account created successfully',
      token: createToken(user),
      user: sanitizeUser(user)
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'account';
      return res.status(409).json({ message: `An account with this ${field} already exists` });
    }

    res.status(500).json({ message: 'Failed to create account', error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      token: createToken(user),
      user: sanitizeUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to login', error: err.message });
  }
});

app.get('/auth/me', authenticate, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.get('/students', authenticate, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { studentId: req.user.studentId };
    const students = await Student.find(query).sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch students', error: err.message });
  }
});

app.post('/add-student', authenticate, requireAdmin, async (req, res) => {
  try {
    const payload = normalizeStudentPayload(req.body);
    const { name, email, studentId } = payload;

    if (!name || !email || !studentId) {
      return res.status(400).json({ message: 'Name, email, and studentId are required' });
    }

    const student = new Student(payload);
    await student.save();

    res.status(201).json({ message: 'Student added successfully', data: student });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'student';
      return res.status(409).json({ message: `A student with this ${field} already exists` });
    }

    res.status(500).json({ message: 'Failed to add student', error: err.message });
  }
});

app.post('/mark-attendance', authenticate, async (req, res) => {
  try {
    const studentId = req.user.role === 'admin' ? req.body.studentId?.trim() : req.user.studentId;

    if (!studentId) {
      return res.status(400).json({ message: 'studentId is required' });
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const now = new Date();
    const today = getDateKey(now);
    const existing = await Attendance.findOne({ studentId, date: today });

    if (existing) {
      return res.status(409).json({ message: 'Attendance already marked today', data: existing });
    }

    const attendance = new Attendance({
      studentId,
      date: today,
      time: getTimeKey(now),
      status: 'Present',
      markedAt: now
    });

    await attendance.save();

    res.status(201).json({ message: 'Attendance marked successfully', data: attendance });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Attendance already marked today' });
    }

    res.status(500).json({ message: 'Failed to mark attendance', error: err.message });
  }
});

app.get('/attendance', authenticate, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { studentId: req.user.studentId };
    const records = await Attendance.find(query).sort({ date: -1, time: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance records', error: err.message });
  }
});

app.get('/attendance/:studentId', authenticate, async (req, res) => {
  try {
    const studentId = req.params.studentId?.trim();

    if (req.user.role !== 'admin' && req.user.studentId !== studentId) {
      return res.status(403).json({ message: 'You can only view your own attendance' });
    }

    const records = await Attendance.find({ studentId }).sort({ date: -1, time: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch student attendance', error: err.message });
  }
});

app.get('/attendance-by-date', authenticate, async (req, res) => {
  try {
    const date = req.query.date || getDateKey();

    if (!isValidDateKey(date)) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format' });
    }

    const query = req.user.role === 'admin' ? { date } : { date, studentId: req.user.studentId };
    const records = await Attendance.find(query).sort({ time: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance by date', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
