const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: "Present"
  }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
