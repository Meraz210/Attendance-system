const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    trim: true
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
    enum: ['Present'],
    default: 'Present'
  },
  markedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Database-level protection against duplicate attendance for one student on one day.
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
