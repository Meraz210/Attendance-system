const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    required: true
  },
  studentId: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

userSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { studentId: { $type: 'string', $gt: '' } } }
);

module.exports = mongoose.model('User', userSchema);
