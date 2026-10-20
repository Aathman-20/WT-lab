const mongoose = require('mongoose');

// CHANGE HERE: Replace Student with the entity required by the question.
// CHANGE HERE: Update MongoDB schema fields and validation rules.
const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [80, 'Name cannot exceed 80 characters']
    },
    rollNo: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true,
      match: [/^[A-Za-z0-9\-]{3,20}$/, 'Roll number must be 3-20 alphanumeric characters or hyphens']
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    year: {
      type: Number,
      required: [true, 'Academic year is required'],
      min: [1, 'Academic year must be at least 1'],
      max: [4, 'Academic year cannot exceed 4']
    }
  },
  {
    timestamps: true
  }
);

// CHANGE HERE: Replace 'Student' model name if adapting to another entity (e.g., 'Book').
module.exports = mongoose.model('Student', studentSchema);