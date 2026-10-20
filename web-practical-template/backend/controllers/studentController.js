const mongoose = require('mongoose');
// CHANGE HERE: Replace Student model import if the model file was renamed.
const Student = require('../models/Student');

// Helper: Validate MongoDB ObjectId format
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// 1. CREATE (POST /api/students)
exports.createStudent = async (req, res, next) => {
  try {
    // CHANGE HERE: Update field names extracted from req.body for the new scenario.
    const { name, rollNo, department, email, year } = req.body;

    if (!name || !rollNo || !department || !email || year === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, rollNo, department, email, year) are required.'
      });
    }

    const created = await Student.create({
      name,
      rollNo,
      department,
      email,
      year: Number(year)
    });

    return res.status(201).json({
      success: true,
      message: 'Student record created successfully.',
      data: created
    });
  } catch (error) {
    // Handle duplicate key error (e.g., duplicate rollNo or email)
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue || {})[0] || 'unique field';
      return res.status(409).json({
        success: false,
        message: `A record with that ${duplicateField} already exists.`
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(' ')
      });
    }
    next(error);
  }
};

// 2. READ ALL (GET /api/students)
exports.getAllStudents = async (req, res, next) => {
  try {
    const records = await Student.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

// 3. READ ONE (GET /api/students/:id)
exports.getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid record ID format.'
      });
    }

    const record = await Student.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

// 4. UPDATE (PUT /api/students/:id)
exports.updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid record ID format.'
      });
    }

    // CHANGE HERE: Update field names extracted from req.body when updating a record.
    const { name, rollNo, department, email, year } = req.body;

    const updated = await Student.findByIdAndUpdate(
      id,
      { name, rollNo, department, email, year: Number(year) },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found for update.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Student record updated successfully.',
      data: updated
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue || {})[0] || 'unique field';
      return res.status(409).json({
        success: false,
        message: `Another record already uses that ${duplicateField}.`
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(' ')
      });
    }
    next(error);
  }
};

// 5. DELETE (DELETE /api/students/:id)
exports.deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid record ID format.'
      });
    }

    const deleted = await Student.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found for deletion.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Student record deleted successfully.',
      data: deleted
    });
  } catch (error) {
    next(error);
  }
};