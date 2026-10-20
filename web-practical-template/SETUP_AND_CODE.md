# Setup and Run Guide: Web Technologies Practical

Project folder: `D:\Aathman\TCE\Web Technologies\web-practical-template`
Use PowerShell. Needs Node.js 18+ and Chrome or Edge.

## 1. Setup (one time)

```powershell
cd "D:\Aathman\TCE\Web Technologies\web-practical-template\backend"
npm install
Copy-Item .env.example .env
notepad .env
```
In `.env` set ONE `MONGODB_URI` line:
- Local: `MONGODB_URI=mongodb://127.0.0.1:27017/practicalDB`
- Atlas: `MONGODB_URI=mongodb+srv://<db_user>:<db_password>@cluster0.k5xwhty.mongodb.net/practicalDB?retryWrites=true&w=majority`

Keep `.env` private. Encode special password characters (`@` = `%40`, `#` = `%23`).

## 2. Start the database
- Local: `Get-Service MongoDB` then `Start-Service MongoDB` (run PowerShell as Administrator).
- Atlas: cluster running, your IP in Network Access, user exists in Database Access.

## 3. Run the application
```powershell
cd "D:\Aathman\TCE\Web Technologies\web-practical-template\backend"
npm start
```
Wait for `[MongoDB] Connected` then `[Server] Running`. Open http://localhost:5000
Stop with Ctrl+C. Auto-restart while editing: `npm run dev`.

## 4. Check the API
```powershell
Invoke-RestMethod http://localhost:5000/api/health
Invoke-RestMethod http://localhost:5000/api/students
```

## 5. Run Selenium tests
Keep the server running, open a second PowerShell window:
```powershell
cd "D:\Aathman\TCE\Web Technologies\web-practical-template\tests"
npm install
npm test
```

## 6. View the XML demo
```powershell
cd "D:\Aathman\TCE\Web Technologies\web-practical-template\xml-demo"
npx --yes http-server -p 8080 -c-1
```
Open http://localhost:8080/students.xml

## 7. If Atlas gives `querySrv ECONNREFUSED` (DNS problem)
```powershell
nslookup -type=SRV _mongodb._tcp.cluster0.k5xwhty.mongodb.net
nslookup -type=SRV _mongodb._tcp.cluster0.k5xwhty.mongodb.net 8.8.8.8
Test-NetConnection ac-efpdjb3-shard-00-00.k5xwhty.mongodb.net -Port 27017
```
Fix: add `DNS_SERVERS=8.8.8.8,8.8.4.4` to `backend\.env`, or switch to the local URI.

## 8. Quick troubleshooting
- `connect ECONNREFUSED 127.0.0.1:27017`: local MongoDB is not running (step 2).
- `bad auth`: wrong user or password in `.env`.
- `Port 5000 is already in use`: stop the old server or change `PORT`.
- Selenium cannot open the page: the server is not running.

---

# Code Files

## `.gitignore`

```
# Unchanged across all scenarios
node_modules/
backend/.env
.DS_Store
Thumbs.db
npm-debug.log*
```

## `backend/.env.example`

```
# Copy this file to ".env" (same folder) and edit. NEVER commit or share ".env".
PORT=5000

# Option 1: Local MongoDB Server (Compass can connect to the same URI)
MONGODB_URI=mongodb://127.0.0.1:27017/practicalDB

# Option 2: Atlas. Replace placeholders; URL-encode special characters in the password (@ -> %40, # -> %23).
# Keep the database name (practicalDB) before the "?".
# MONGODB_URI=mongodb+srv://<db_user>:<db_password>@cluster0.xxxxx.mongodb.net/practicalDB?retryWrites=true&w=majority

# Optional DNS settings for Atlas (see README). Leave commented unless you need them.
# DNS_SERVERS=8.8.8.8,8.8.4.4
# DNS_FALLBACK=off
```

## `backend/package.json`

```json
{
  "name": "practical-exam-backend",
  "version": "1.1.0",
  "description": "Reusable Node.js, Express, and MongoDB CRUD backend for practical examinations",
  "main": "server.js",
  "engines": { "node": ">=18" },
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "mongoose": "^8.5.1"
  }
}
```

## `backend/server.js`

```javascript
// backend/server.js
// Purpose: Express app. The HTTP server starts ONLY after MongoDB has connected.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // load .env BEFORE reading process.env

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// CHANGE HERE: update route import if renamed for another entity.
const studentRoutes = require('./routes/studentRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (works even if DB drops later; reports DB state).
app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected'
  });
});

// Guard: never run CRUD against an unavailable database (e.g. connection lost after startup).
function requireDb(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, message: 'Database is unavailable. Please try again shortly.' });
  }
  next();
}

// CHANGE HERE: update the API endpoint (e.g. '/api/books').
app.use('/api/students', requireDb, studentRoutes);

// Unknown /api paths -> JSON 404
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'API route not found.' }));

// Serve frontend so http://localhost:5000 opens index.html
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Central error handler (keeps the real cause in the server log)
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.stack || err.message);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body.' });
  }
  res.status(500).json({ success: false, message: 'An unexpected server error occurred. Please try again.' });
});

async function start() {
  await connectDB(); // 1. database first; throws on failure

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => { // 2. only now start HTTP
    console.log(`[Server] Running at http://localhost:${PORT}`);
    console.log(`[Server] REST endpoint: http://localhost:${PORT}/api/students`);
    console.log(`[Server] Health check:  http://localhost:${PORT}/api/health`);
  });

  server.on('error', (err) => {
    console.error(err.code === 'EADDRINUSE'
      ? `[Server] Port ${PORT} is already in use. Stop the other process or change PORT in .env.`
      : `[Server] Failed to start: ${err.message}`);
    process.exit(1);
  });

  mongoose.connection.on('disconnected', () => console.warn('[MongoDB] Connection lost.'));
  mongoose.connection.on('reconnected', () => console.log('[MongoDB] Reconnected.'));

  process.on('SIGINT', async () => {
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  });
}

start().catch((err) => {
  console.error('[Startup] Could not start the application.');
  console.error(`[Startup] Reason: ${err.message}`);
  if (err.code) console.error(`[Startup] Error code: ${err.code}`);
  console.error('[Startup] See README.md -> Troubleshooting (DNS / Atlas / local MongoDB).');
  process.exit(1);
});
```

## `backend/config/db.js`

```javascript
// backend/config/db.js
// Purpose: connect Mongoose to MongoDB (Atlas "mongodb+srv://" OR local "mongodb://").
// Exports an async function that server.js AWAITS. It throws on failure (it never calls process.exit).
//
// DNS NOTE: mongodb+srv:// URIs need a DNS SRV lookup. Node uses its own resolver (c-ares) for that,
// which can fail with "querySrv ECONNREFUSED" even when Windows nslookup works.
//   - DNS_SERVERS in .env  -> use those DNS servers from the start (process-wide).
//   - otherwise            -> try the default resolver first; if the SRV lookup fails, retry ONCE with
//                             public DNS (8.8.8.8, 8.8.4.4). Set DNS_FALLBACK=off to disable that retry.
// Limitation: this only helps if your network allows DNS queries to those servers.

const dns = require('dns');
const mongoose = require('mongoose');

// Fail immediately instead of buffering queries for 10s when the DB is down.
mongoose.set('bufferCommands', false);

const FALLBACK_DNS = ['8.8.8.8', '8.8.4.4'];

function parseList(value) {
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function validateUri(uri) {
  if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error('MONGODB_URI is missing or invalid. It must start with mongodb:// or mongodb+srv:// (check backend/.env).');
  }
}

function isSrvDnsError(err) {
  // Node reports SRV failures as: "querySrv ECONNREFUSED _mongodb._tcp.<host>"
  return /querySrv/.test(String(err && err.message)) || (err && err.syscall === 'querySrv');
}

async function tryConnect(uri) {
  return mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}

async function connectDB() {
  // CHANGE HERE: set MONGODB_URI in backend/.env (Atlas or local). The fallback below is local only.
  const uri = process.env.MONGODB_URI;
  validateUri(uri);

  const explicit = parseList(process.env.DNS_SERVERS);
  if (explicit.length) {
    dns.setServers(explicit);
    console.log(`[DNS] Using DNS servers from .env: ${explicit.join(', ')}`);
  }

  let conn;
  try {
    conn = await tryConnect(uri);
  } catch (err) {
    const canFallback = uri.startsWith('mongodb+srv://') && !explicit.length
      && String(process.env.DNS_FALLBACK).toLowerCase() !== 'off' && isSrvDnsError(err);
    if (!canFallback) throw err;

    console.warn(`[DNS] SRV lookup failed with default resolver (${err.message}).`);
    console.warn(`[DNS] Retrying once with ${FALLBACK_DNS.join(', ')} ...`);
    dns.setServers(FALLBACK_DNS);
    conn = await tryConnect(uri); // a second failure is thrown to the caller
  }

  console.log(`[MongoDB] Connected to host: ${conn.connection.host}`);
  console.log(`[MongoDB] Active database: ${conn.connection.name}`);
  return conn;
}

module.exports = connectDB;
```

## `backend/models/Student.js`

```javascript
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
```

## `backend/routes/studentRoutes.js`

```javascript
const express = require('express');
const router = express.Router();

// CHANGE HERE: Update controller import and method names if renamed for the new entity.
const {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');

router.route('/')
  .get(getAllStudents)
  .post(createStudent);

router.route('/:id')
  .get(getStudentById)
  .put(updateStudent)
  .delete(deleteStudent);

module.exports = router;
```

## `backend/controllers/studentController.js`

```javascript
// CHANGE HERE: Replace Student model import if the model file was renamed.
const Student = require('../models/Student');

// Helper: Validate MongoDB ObjectId format
function isValidObjectId(id) {
  return /^[a-fA-F0-9]{24}$/.test(String(id)); // strict 24-hex check
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
    const allowed = ['name', 'rollNo', 'department', 'email', 'year'];
    const changes = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) changes[key] = key === 'year' ? Number(req.body[key]) : req.body[key];
    });

    const updated = await Student.findByIdAndUpdate(
      id,
      changes,
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
```

## `frontend/index.html`

```html
<!DOCTYPE html>
<html lang="en" ng-app="practicalApp">
<!-- =====================================================================
     SECTION 1: HTML DOCUMENT STRUCTURE AND METADATA
     ===================================================================== -->
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- CHANGE HERE: Update the application title for the new scenario. -->
  <title>Student Management System | Academic Registry</title>

  <!-- ===================================================================
       SECTION 2: EXTERNAL CSS REFERENCE
       =================================================================== -->
  <link rel="stylesheet" href="style.css">

  <!-- ===================================================================
       SECTION 3: ANGULARJS LIBRARY REFERENCE (v1.8.3)
       NOTE: Loading from CDN requires internet access. For offline exams,
       download angular.min.js into frontend/ and change src="angular.min.js".
       =================================================================== -->
  <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular.min.js"></script>

  <script>
    /* ===================================================================
       SECTION 4: ANGULARJS MODULE CONFIGURATION
       Unchanged structure: Only rename the module if explicitly asked.
       =================================================================== */
    var app = angular.module('practicalApp', []);

    /* ===================================================================
       SECTION 5: API SERVICE ($http communication with Node.js Backend)
       =================================================================== */
    // CHANGE HERE: Replace StudentService with the new entity service name if desired.
    app.service('StudentService', ['$http', function($http) {
      // CHANGE HERE: Update the backend API endpoint (e.g., '/api/books' or 'http://localhost:5000/api/books').
      // Served by Express -> relative URL works. Opened as a file:// page -> fall back to localhost:5000.
      var API_BASE = (window.location.protocol === 'file:') ? 'http://localhost:5000' : '';
      var API_URL = API_BASE + '/api/students';

      this.getAll = function() {
        return $http.get(API_URL);
      };

      this.getById = function(id) {
        return $http.get(API_URL + '/' + id);
      };

      this.create = function(recordData) {
        return $http.post(API_URL, recordData);
      };

      this.update = function(id, recordData) {
        return $http.put(API_URL + '/' + id, recordData);
      };

      this.remove = function(id) {
        return $http.delete(API_URL + '/' + id);
      };
    }]);

    /* ===================================================================
       SECTION 6: CONTROLLER (CRUD State, Validation, Search, Selection)
       =================================================================== */
    // CHANGE HERE: Replace StudentController and injected service name if renamed.
    app.controller('StudentController', ['$scope', 'StudentService', function($scope, StudentService) {

      // Application state variables (Normally unchanged across scenarios)
      $scope.records = [];
      $scope.selectedRecord = null;
      $scope.isEditMode = false;
      $scope.isLoading = false;
      $scope.searchQuery = '';
      $scope.filterDepartment = '';
      $scope.statusMessage = '';
      $scope.errorMessage = '';

      // CHANGE HERE: Update dropdown options to match your scenario (e.g., Book Categories, Hospital Wards).
      $scope.departments = [
        'Computer Science',
        'Electronics',
        'Mechanical',
        'Civil Engineering',
        'Information Technology'
      ];

      // CHANGE HERE: Update default form fields to match the entity attributes required by the exam.
      function getEmptyForm() {
        return {
          name: '',
          rollNo: '',
          department: '',
          email: '',
          year: 1
        };
      }

      $scope.formData = getEmptyForm();

      // Helper to display feedback messages clearly
      function setFeedback(statusMsg, errorMsg) {
        $scope.statusMessage = statusMsg || '';
        $scope.errorMessage = errorMsg || '';
      }

      // 1. READ ALL RECORDS
      $scope.loadRecords = function() {
        $scope.isLoading = true;
        StudentService.getAll()
          .then(function(response) {
            $scope.records = response.data.data || [];
            $scope.isLoading = false;
          })
          .catch(function(error) {
            $scope.isLoading = false;
            var msg = (error.data && error.data.message) ? error.data.message : 'Unable to connect to the backend server.';
            setFeedback('', msg);
          });
      };

      // 2. CREATE OR UPDATE RECORD
      $scope.saveRecord = function(isValid) {
        setFeedback('', '');

        if (!isValid) {
          setFeedback('', 'Please correct the highlighted validation errors before submitting.');
          return;
        }

        // CHANGE HERE: Update payload fields and type conversions for the target entity.
        var payload = {
          name: $scope.formData.name,
          rollNo: $scope.formData.rollNo,
          department: $scope.formData.department,
          email: $scope.formData.email,
          year: Number($scope.formData.year)
        };

        $scope.isLoading = true;

        if ($scope.isEditMode && $scope.formData._id) {
          // UPDATE EXISTING RECORD
          StudentService.update($scope.formData._id, payload)
            .then(function(response) {
              $scope.isLoading = false;
              setFeedback(response.data.message || 'Record updated successfully.', '');
              if ($scope.selectedRecord && $scope.selectedRecord._id === $scope.formData._id) {
                $scope.selectedRecord = response.data.data;
              }
              $scope.resetForm();
              $scope.loadRecords();
            })
            .catch(function(error) {
              $scope.isLoading = false;
              var msg = (error.data && error.data.message) ? error.data.message : 'Failed to update record.';
              setFeedback('', msg);
            });
        } else {
          // CREATE NEW RECORD
          StudentService.create(payload)
            .then(function(response) {
              $scope.isLoading = false;
              setFeedback(response.data.message || 'Record created successfully.', '');
              $scope.resetForm();
              $scope.loadRecords();
            })
            .catch(function(error) {
              $scope.isLoading = false;
              var msg = (error.data && error.data.message) ? error.data.message : 'Failed to create record.';
              setFeedback('', msg);
            });
        }
      };

      // 3. VIEW SINGLE RECORD DETAILS (Calls GET /api/students/:id)
      $scope.viewRecord = function(id) {
        setFeedback('', '');
        StudentService.getById(id)
          .then(function(response) {
            $scope.selectedRecord = response.data.data;
          })
          .catch(function(error) {
            var msg = (error.data && error.data.message) ? error.data.message : 'Could not fetch record details.';
            setFeedback('', msg);
          });
      };

      $scope.closeDetails = function() {
        $scope.selectedRecord = null;
      };

      // 4. POPULATE FORM FOR EDITING
      $scope.editRecord = function(record) {
        setFeedback('', '');
        $scope.isEditMode = true;
        // CHANGE HERE: Copy all scenario-specific properties into formData for editing.
        $scope.formData = {
          _id: record._id,
          name: record.name,
          rollNo: record.rollNo,
          department: record.department,
          email: record.email,
          year: Number(record.year)
        };
      };

      // 5. DELETE RECORD
      $scope.deleteRecord = function(id, label) {
        setFeedback('', '');
        StudentService.remove(id)
          .then(function(response) {
            setFeedback(response.data.message || ('Deleted record: ' + label), '');
            if ($scope.selectedRecord && $scope.selectedRecord._id === id) {
              $scope.selectedRecord = null;
            }
            if ($scope.isEditMode && $scope.formData._id === id) {
              $scope.resetForm();
            }
            $scope.loadRecords();
          })
          .catch(function(error) {
            var msg = (error.data && error.data.message) ? error.data.message : 'Failed to delete record.';
            setFeedback('', msg);
          });
      };

      // 6. RESET FORM STATE
      $scope.resetForm = function() {
        $scope.isEditMode = false;
        $scope.formData = getEmptyForm();
        if ($scope.entityForm) {
          $scope.entityForm.$setPristine();
          $scope.entityForm.$setUntouched();
        }
      };

      // 7. SEARCH AND FILTER PREDICATE FUNCTION
      // CHANGE HERE: Update the searchable fields (e.g., item.title, item.isbn, item.author).
      $scope.searchFilter = function(item) {
        var matchesDepartment = !$scope.filterDepartment || item.department === $scope.filterDepartment;
        if (!$scope.searchQuery) {
          return matchesDepartment;
        }
        var q = $scope.searchQuery.toLowerCase();
        var matchName = item.name && item.name.toLowerCase().indexOf(q) !== -1;
        var matchRoll = item.rollNo && item.rollNo.toLowerCase().indexOf(q) !== -1;
        var matchDept = item.department && item.department.toLowerCase().indexOf(q) !== -1;
        var matchEmail = item.email && item.email.toLowerCase().indexOf(q) !== -1;

        return matchesDepartment && (matchName || matchRoll || matchDept || matchEmail);
      };

      // Initialize data when controller loads
      $scope.loadRecords();
    }]);

    /* ===================================================================
       SECTION 7: CUSTOM FILTER
       Formats numeric academic year (1-4) into readable academic standing.
       =================================================================== */
    // CHANGE HERE: Modify the custom filter logic if your scenario formats prices, stock, or dates.
    app.filter('academicYearLabel', function() {
      return function(input) {
        var yearNum = parseInt(input, 10);
        var labels = {
          1: 'Year 1 (First Year)',
          2: 'Year 2 (Second Year)',
          3: 'Year 3 (Third Year)',
          4: 'Year 4 (Final Year)'
        };
        return labels[yearNum] || ('Year ' + input);
      };
    });

    /* ===================================================================
       SECTION 8: CUSTOM DIRECTIVE
       Renders a structured summary badge for each record in the table/view.
       =================================================================== */
    // CHANGE HERE: Modify the custom directive attributes and template if its display behavior must change.
    app.directive('recordBadge', function() {
      return {
        restrict: 'E',
        scope: {
          code: '@',
          category: '@'
        },
        template: '<span class="record-badge"><strong>{{code}}</strong> &middot; {{category}}</span>'
      };
    });
  </script>
</head>

<!-- =====================================================================
     SECTION 9: APPLICATION HTML AND CRUD INTERFACE
     ===================================================================== -->
<body ng-controller="StudentController">

  <!-- Top Header Bar -->
  <header class="site-header">
    <div class="container header-inner">
      <div>
        <!-- CHANGE HERE: Replace Student Management System with the new application name. -->
        <h1 id="app-title" class="site-title">Student Management System</h1>
        <p class="site-subtitle">Academic Enrollment &amp; Departmental Record Registry</p>
      </div>
      <div class="header-meta">
        <span class="record-counter" id="total-records-count">
          Total Records: <strong>{{records.length}}</strong>
        </span>
      </div>
    </div>
  </header>

  <main class="container main-layout">

    <!-- Status and Error Feedback Banners -->
    <section aria-live="polite" class="feedback-area">
      <div id="status-banner" class="alert alert-success" ng-show="statusMessage">
        <strong>Success:</strong> <span id="status-message-text">{{statusMessage}}</span>
        <button type="button" class="alert-close" ng-click="statusMessage = ''" aria-label="Dismiss success message">Dismiss</button>
      </div>

      <div id="error-banner" class="alert alert-error" ng-show="errorMessage">
        <strong>Error:</strong> <span id="error-message-text">{{errorMessage}}</span>
        <button type="button" class="alert-close" ng-click="errorMessage = ''" aria-label="Dismiss error message">Dismiss</button>
      </div>

      <div id="loading-indicator" class="loading-bar" ng-if="isLoading">
        Processing request with database...
      </div>
    </section>

    <div class="workspace-grid">

      <!-- LEFT COLUMN: CREATE / EDIT FORM -->
      <section class="panel form-panel" aria-labelledby="form-heading">
        <div class="panel-header">
          <!-- CHANGE HERE: Update form section headings for the target entity. -->
          <h2 id="form-heading" class="panel-title">
            {{isEditMode ? 'Edit Student Record' : 'Register New Student'}}
          </h2>
          <span class="mode-indicator" ng-if="isEditMode">Editing Mode</span>
        </div>

        <form name="entityForm" id="student-form" ng-submit="saveRecord(entityForm.$valid)" novalidate>

          <!-- Field 1: Name -->
          <!-- CHANGE HERE: Update label, id, ng-model, and validation message for Field 1 (e.g., Book Title). -->
          <div class="form-group">
            <label for="input-name">Full Name <span class="required-mark">*</span></label>
            <input
              type="text"
              id="input-name"
              name="name"
              ng-model="formData.name"
              placeholder="e.g., Ananya Sharma"
              required
              ng-minlength="2"
              maxlength="80">
            <div class="field-error" id="error-name" ng-show="(entityForm.$submitted || entityForm.name.$touched) && entityForm.name.$invalid">
              <span ng-show="entityForm.name.$error.required">Full name is required.</span>
              <span ng-show="entityForm.name.$error.minlength">Name must be at least 2 characters.</span>
            </div>
          </div>

          <!-- Field 2: Roll Number -->
          <!-- CHANGE HERE: Update label, id, ng-model, and validation for Field 2 (e.g., ISBN / Employee ID). -->
          <div class="form-group">
            <label for="input-rollNo">Roll Number <span class="required-mark">*</span></label>
            <input
              type="text"
              id="input-rollNo"
              name="rollNo"
              ng-model="formData.rollNo"
              placeholder="e.g., CS2026-101"
              required
              ng-pattern="/^[A-Za-z0-9\-]{3,20}$/">
            <div class="field-error" id="error-rollNo" ng-show="(entityForm.$submitted || entityForm.rollNo.$touched) && entityForm.rollNo.$invalid">
              <span ng-show="entityForm.rollNo.$error.required">Roll number is required.</span>
              <span ng-show="entityForm.rollNo.$error.pattern">Use 3 to 20 alphanumeric characters or hyphens.</span>
            </div>
          </div>

          <!-- Field 3: Department -->
          <!-- CHANGE HERE: Update label, id, and ng-model for Field 3 (e.g., Author / Category). -->
          <div class="form-group">
            <label for="input-department">Department <span class="required-mark">*</span></label>
            <select
              id="input-department"
              name="department"
              ng-model="formData.department"
              required>
              <option value="">-- Select Department --</option>
              <option ng-repeat="dept in departments" value="{{dept}}">{{dept}}</option>
            </select>
            <div class="field-error" id="error-department" ng-show="(entityForm.$submitted || entityForm.department.$touched) && entityForm.department.$invalid">
              <span ng-show="entityForm.department.$error.required">Please select a department.</span>
            </div>
          </div>

          <!-- Field 4: Email -->
          <!-- CHANGE HERE: Update label, id, type, and ng-model for Field 4 (e.g., Publisher Email / Price). -->
          <div class="form-group">
            <label for="input-email">Official Email <span class="required-mark">*</span></label>
            <input
              type="email"
              id="input-email"
              name="email"
              ng-model="formData.email"
              placeholder="e.g., ananya.sharma@college.edu"
              required>
            <div class="field-error" id="error-email" ng-show="(entityForm.$submitted || entityForm.email.$touched) && entityForm.email.$invalid">
              <span ng-show="entityForm.email.$error.required">Email address is required.</span>
              <span ng-show="entityForm.email.$error.email">Enter a valid email address format.</span>
            </div>
          </div>

          <!-- Field 5: Year of Study -->
          <!-- CHANGE HERE: Update label, id, min, max, and ng-model for Field 5 (e.g., Publication Year / Stock). -->
          <div class="form-group">
            <label for="input-year">Academic Year (1 to 4) <span class="required-mark">*</span></label>
            <input
              type="number"
              id="input-year"
              name="year"
              ng-model="formData.year"
              min="1"
              max="4"
              required>
            <div class="field-error" id="error-year" ng-show="(entityForm.$submitted || entityForm.year.$touched) && entityForm.year.$invalid">
              <span ng-show="entityForm.year.$error.required">Academic year is required.</span>
              <span ng-show="entityForm.year.$error.min || entityForm.year.$error.max">Academic year must be between 1 and 4.</span>
            </div>
          </div>

          <!-- Form Buttons -->
          <div class="form-actions">
            <button type="submit" id="btn-submit" class="btn btn-primary">
              {{isEditMode ? 'Update Student' : 'Add Student'}}
            </button>
            <button type="button" id="btn-reset" class="btn btn-secondary" ng-click="resetForm()">
              {{isEditMode ? 'Cancel Edit' : 'Clear Form'}}
            </button>
          </div>
        </form>
      </section>

      <!-- RIGHT COLUMN: SEARCH, FILTER, TABLE, AND DETAILS VIEW -->
      <section class="panel list-panel" aria-labelledby="list-heading">
        <div class="panel-header">
          <!-- CHANGE HERE: Update directory heading for the target scenario. -->
          <h2 id="list-heading" class="panel-title">Registered Student Directory</h2>
          <button type="button" id="btn-refresh" class="btn btn-secondary btn-sm" ng-click="loadRecords()">
            Refresh List
          </button>
        </div>

        <!-- Search and Filter Controls -->
        <div class="toolbar">
          <div class="toolbar-item search-box">
            <label for="search-input">Search Records</label>
            <!-- CHANGE HERE: Update search placeholder text. -->
            <input
              type="text"
              id="search-input"
              ng-model="searchQuery"
              placeholder="Search by name, roll no, department, or email...">
          </div>

          <div class="toolbar-item filter-box">
            <label for="filter-department">Filter by Department</label>
            <select id="filter-department" ng-model="filterDepartment">
              <option value="">All Departments</option>
              <option ng-repeat="dept in departments" value="{{dept}}">{{dept}}</option>
            </select>
          </div>
        </div>

        <!-- Selected Record Detail Inspection Panel (Demonstrates GET /api/students/:id and Custom Directive) -->
        <div id="record-details-panel" class="details-box" ng-if="selectedRecord">
          <div class="details-header">
            <h3>Student Record Inspector</h3>
            <button type="button" id="btn-close-details" class="btn btn-secondary btn-sm" ng-click="closeDetails()">
              Close Inspector
            </button>
          </div>
          <!-- CHANGE HERE: Update inspected detail fields and custom directive attributes. -->
          <div class="details-grid">
            <div><strong>Full Name:</strong> <span id="detail-name">{{selectedRecord.name}}</span></div>
            <div><strong>Roll Number:</strong> <span id="detail-rollNo">{{selectedRecord.rollNo}}</span></div>
            <div><strong>Department:</strong> <span id="detail-department">{{selectedRecord.department}}</span></div>
            <div><strong>Official Email:</strong> <span id="detail-email">{{selectedRecord.email}}</span></div>
            <div><strong>Academic Standing:</strong> <span id="detail-year">{{selectedRecord.year | academicYearLabel}}</span></div>
            <div>
              <strong>Summary Badge:</strong>
              <record-badge code="{{selectedRecord.rollNo}}" category="{{selectedRecord.department}}"></record-badge>
            </div>
          </div>
        </div>

        <!-- Records Table -->
        <div class="table-responsive">
          <table id="records-table" class="data-table">
            <thead>
              <!-- CHANGE HERE: Update table column headers to match your entity fields. -->
              <tr>
                <th scope="col">Roll No &amp; Dept</th>
                <th scope="col">Student Name</th>
                <th scope="col">Email Address</th>
                <th scope="col">Academic Year</th>
                <th scope="col" class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <!-- CHANGE HERE: Update row bindings, custom directive, and custom filter usage. -->
              <tr ng-repeat="student in filteredRecords = (records | filter:searchFilter)" class="record-row" data-roll="{{student.rollNo}}">
                <td data-label="Roll No &amp; Dept">
                  <!-- Custom Directive Usage -->
                  <record-badge code="{{student.rollNo}}" category="{{student.department}}"></record-badge>
                </td>
                <td data-label="Student Name" class="cell-primary">{{student.name}}</td>
                <td data-label="Email Address">{{student.email}}</td>
                <td data-label="Academic Year">
                  <!-- Custom Filter Usage -->
                  {{student.year | academicYearLabel}}
                </td>
                <td data-label="Actions" class="actions-cell">
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm btn-view"
                    ng-click="viewRecord(student._id)">
                    View
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm btn-edit"
                    ng-click="editRecord(student)">
                    Edit
                  </button>
                  <button
                    type="button"
                    class="btn btn-danger btn-sm btn-delete"
                    ng-click="deleteRecord(student._id, student.rollNo)">
                    Delete
                  </button>
                </td>
              </tr>

              <!-- Empty State Row -->
              <tr id="empty-state-row" ng-if="filteredRecords.length === 0 && !isLoading">
                <td colspan="5" class="empty-state">
                  No matching student records found. Use the form on the left to add a record or clear your search filter.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>
  </main>

  <footer class="site-footer">
    <div class="container">
      <!-- CHANGE HERE: Update footer caption if required by the scenario. -->
      <p>Academic Registry Portal &middot; Powered by AngularJS 1.8, Express, and MongoDB</p>
    </div>
  </footer>

</body>
</html>
```

## `frontend/style.css`

```css
/* style.css - colours: white, black, greys and green only (red only for errors/delete) */

:root {
  /* CHANGE HERE: colours */
  --green: #2e7d32;
  --green-dark: #1b5e20;
  --green-light: #e8f5e9;
  --black: #212121;
  --grey-dark: #616161;
  --grey: #bdbdbd;
  --grey-light: #eeeeee;
  --grey-bg: #f5f5f5;
  --white: #ffffff;
  --red: #c62828;
  --red-light: #fdecea;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--grey-bg);
  color: var(--black);
  font-family: Arial, Helvetica, sans-serif;
  font-size: 15px;
  line-height: 1.5;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* header */
.site-header {
  background: var(--green-dark);
  color: var(--white);
  padding: 16px 0;
}

.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.site-title {
  margin: 0;
  font-size: 24px;
}

.site-subtitle {
  margin: 2px 0 0;
  font-size: 14px;
  color: var(--grey-light);
}

.record-counter {
  background: var(--white);
  color: var(--black);
  padding: 6px 12px;
  border-radius: 3px;
  font-size: 14px;
}

.main-layout {
  padding-top: 20px;
  padding-bottom: 30px;
}

/* messages */
.alert {
  padding: 10px 14px;
  margin-bottom: 10px;
  border: 1px solid;
  border-radius: 3px;
}

.alert-success {
  background: var(--green-light);
  border-color: var(--green);
  color: var(--green-dark);
}

.alert-error {
  background: var(--red-light);
  border-color: var(--red);
  color: var(--red);
}

.alert-close {
  float: right;
  background: none;
  border: none;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
  font-size: 13px;
}

.loading-bar {
  padding: 8px 14px;
  margin-bottom: 10px;
  background: var(--grey-light);
  border: 1px solid var(--grey);
  color: var(--grey-dark);
  border-radius: 3px;
}

/* layout */
.workspace-grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 20px;
  align-items: start;
}

.panel {
  background: var(--white);
  border: 1px solid var(--grey);
  border-radius: 3px;
  padding: 18px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--grey-light);
}

.panel-title {
  margin: 0;
  font-size: 18px;
}

.mode-indicator {
  background: var(--green);
  color: var(--white);
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
}

/* form */
.form-group {
  margin-bottom: 12px;
}

label {
  display: block;
  margin-bottom: 4px;
  font-weight: bold;
  font-size: 14px;
}

.required-mark {
  color: var(--red);
}

input[type="text"],
input[type="email"],
input[type="number"],
select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--grey);
  border-radius: 3px;
  background: var(--white);
  color: var(--black);
  font-size: 14px;
  font-family: inherit;
}

input:focus,
select:focus {
  outline: 2px solid var(--green);
  border-color: var(--green);
}

.field-error {
  margin-top: 3px;
  color: var(--red);
  font-size: 13px;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

/* buttons */
.btn {
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 3px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
}

.btn-primary {
  background: var(--green);
  color: var(--white);
}

.btn-primary:hover {
  background: var(--green-dark);
}

.btn-secondary {
  background: var(--white);
  color: var(--black);
  border-color: var(--grey);
}

.btn-secondary:hover {
  background: var(--grey-light);
}

.btn-danger {
  background: var(--white);
  color: var(--red);
  border-color: var(--red);
}

.btn-danger:hover {
  background: var(--red);
  color: var(--white);
}

.btn-sm {
  padding: 4px 9px;
  font-size: 13px;
}

/* search bar */
.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  padding: 10px;
  background: var(--grey-bg);
  border: 1px solid var(--grey-light);
}

.toolbar-item {
  flex: 1;
  min-width: 180px;
}

/* details box */
.details-box {
  margin-bottom: 14px;
  padding: 12px;
  background: var(--grey-bg);
  border-left: 4px solid var(--green);
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.details-header h3 {
  margin: 0;
  font-size: 16px;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
  font-size: 14px;
}

.record-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--green-light);
  border: 1px solid var(--green);
  color: var(--green-dark);
  border-radius: 3px;
  font-size: 13px;
}

/* table */
.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 9px 10px;
  text-align: left;
  border-bottom: 1px solid var(--grey-light);
  vertical-align: middle;
}

.data-table th {
  background: var(--grey-light);
  font-size: 13px;
}

.data-table tbody tr:hover {
  background: var(--grey-bg);
}

.cell-primary {
  font-weight: bold;
}

.actions-cell {
  white-space: nowrap;
}

.actions-cell .btn {
  margin-right: 3px;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--grey-dark);
}

.site-footer {
  padding: 14px 0;
  background: var(--black);
  color: var(--grey);
  font-size: 13px;
  text-align: center;
}

.site-footer p {
  margin: 0;
}

/* small screens */
@media (max-width: 900px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .data-table thead {
    display: none;
  }

  .data-table tr,
  .data-table td {
    display: block;
  }

  .data-table tr {
    padding: 8px 0;
    border-bottom: 2px solid var(--grey);
  }

  .data-table td {
    border: none;
    padding: 3px 10px;
  }

  .data-table td::before {
    content: attr(data-label) ": ";
    font-weight: bold;
    color: var(--grey-dark);
  }

  .data-table td.actions-cell::before {
    content: "";
  }

  #empty-state-row td::before {
    content: "";
  }
}
```

## `tests/package.json`

```json
{
  "name": "practical-exam-selenium-tests",
  "version": "1.0.0",
  "description": "Automated end-to-end Selenium WebDriver tests for CRUD verification",
  "scripts": {
    "test": "node student.test.js"
  },
  "dependencies": {
    "selenium-webdriver": "^4.23.0"
  }
}
```

## `tests/student.test.js`

```javascript
const assert = require('assert');
const { Builder, By, until } = require('selenium-webdriver');

// CHANGE HERE: Update the application URL if using a different port.
const APP_URL = process.env.APP_URL || 'http://localhost:5000';
const WAIT_TIMEOUT = 10000;

// Generate a unique suffix so test runs never collide with existing database records
const uniqueSuffix = Date.now().toString().slice(-5);

// CHANGE HERE: Update test record values for the new scenario (e.g., Book title, ISBN, Author).
const testRecord = {
  name: `Rohan Verma ${uniqueSuffix}`,
  updatedName: `Rohan Verma Updated ${uniqueSuffix}`,
  rollNo: `CS-${uniqueSuffix}`,
  department: 'Computer Science',
  email: `rohan.${uniqueSuffix}@college.edu`,
  year: '3'
};

async function runTests() {
  console.log('==========================================================');
  console.log(' Starting Selenium WebDriver CRUD Automation Suite');
  console.log(' Target Application URL:', APP_URL);
  console.log('==========================================================');

  // Launches Chrome via Selenium Manager (falls back to Microsoft Edge if needed)
  let driver;
  try {
    driver = await new Builder().forBrowser('chrome').build();
  } catch (chromeErr) {
    console.log('Chrome not detected, falling back to Microsoft Edge...');
    driver = await new Builder().forBrowser('MicrosoftEdge').build();
  }

  try {
    // -----------------------------------------------------------------
    // TEST 1 & 2: Open Application and Verify Page Loads Correctly
    // -----------------------------------------------------------------
    console.log('\n[Test 1 & 2] Opening application and verifying header title...');
    await driver.get(APP_URL);

    const headingEl = await driver.wait(until.elementLocated(By.id('app-title')), WAIT_TIMEOUT);
    const headingText = await headingEl.getText();
    // CHANGE HERE: Update expected application title text.
    assert.strictEqual(headingText, 'Student Management System', 'Application heading did not match.');
    console.log(' -> PASSED: Page loaded with heading:', headingText);

    // -----------------------------------------------------------------
    // TEST 3: Test Form Validation Behavior on Empty Submission
    // -----------------------------------------------------------------
    console.log('\n[Test 3] Testing required field validation on empty submit...');
    const submitBtn = await driver.findElement(By.id('btn-submit'));
    await submitBtn.click();

    const errorBanner = await driver.wait(until.elementLocated(By.id('error-banner')), WAIT_TIMEOUT);
    await driver.wait(until.elementIsVisible(errorBanner), WAIT_TIMEOUT);
    const validationBannerText = await driver.findElement(By.id('error-message-text')).getText();
    assert.ok(validationBannerText.includes('validation errors'), 'Validation error banner should appear.');
    const nameErr = await driver.findElement(By.id('error-name'));
    await driver.wait(until.elementIsVisible(nameErr), WAIT_TIMEOUT);
    console.log(' -> PASSED: Validation prevented empty form submission.');

    // -----------------------------------------------------------------
    // TEST 4: Fill and Submit the Form to Create a Record
    // -----------------------------------------------------------------
    console.log('\n[Test 4] Filling form and creating a new record...');
    // CHANGE HERE: Update Selenium input selectors to match your HTML form field IDs.
    await driver.findElement(By.id('input-name')).clear();
    await driver.findElement(By.id('input-name')).sendKeys(testRecord.name);

    await driver.findElement(By.id('input-rollNo')).clear();
    await driver.findElement(By.id('input-rollNo')).sendKeys(testRecord.rollNo);

    const deptSelect = await driver.findElement(By.id('input-department'));
    await deptSelect.findElement(By.css(`option[value="${testRecord.department}"]`)).click();

    await driver.findElement(By.id('input-email')).clear();
    await driver.findElement(By.id('input-email')).sendKeys(testRecord.email);

    const yearInput = await driver.findElement(By.id('input-year'));
    await yearInput.clear();
    await yearInput.sendKeys(testRecord.year);

    await submitBtn.click();

    // Wait for success message banner
    const statusBanner = await driver.wait(until.elementLocated(By.id('status-banner')), WAIT_TIMEOUT);
    await driver.wait(until.elementIsVisible(statusBanner), WAIT_TIMEOUT);
    console.log(' -> PASSED: Form submitted and success banner displayed.');

    // -----------------------------------------------------------------
    // TEST 5: Verify Created Record Appears & Test Search Filtering
    // -----------------------------------------------------------------
    console.log('\n[Test 5] Searching for the newly created record...');
    const searchInput = await driver.findElement(By.id('search-input'));
    await searchInput.clear();
    await searchInput.sendKeys(testRecord.rollNo);

    // Locate the specific row by data-roll attribute
    // CHANGE HERE: Update row selector attribute if data-roll was renamed.
    const rowSelector = By.css(`tr.record-row[data-roll="${testRecord.rollNo}"]`);
    const createdRow = await driver.wait(until.elementLocated(rowSelector), WAIT_TIMEOUT);
    const rowText = await createdRow.getText();
    assert.ok(rowText.includes(testRecord.name), 'Created record name must appear in the filtered table row.');
    console.log(' -> PASSED: Created record located via search filter:', testRecord.rollNo);

    // -----------------------------------------------------------------
    // TEST 6: View Record Details Inspector
    // -----------------------------------------------------------------
    console.log('\n[Test 6] Clicking View button to inspect single record details...');
    const viewBtn = await createdRow.findElement(By.css('.btn-view'));
    await viewBtn.click();

    const detailPanel = await driver.wait(until.elementLocated(By.id('record-details-panel')), WAIT_TIMEOUT);
    await driver.wait(until.elementIsVisible(detailPanel), WAIT_TIMEOUT);
    const detailRollText = await driver.findElement(By.id('detail-rollNo')).getText();
    assert.strictEqual(detailRollText, testRecord.rollNo, 'Inspector panel rollNo should match record.');
    console.log(' -> PASSED: Record inspector loaded single record from backend.');

    // -----------------------------------------------------------------
    // TEST 7: Edit Existing Record and Verify Updated Changes
    // -----------------------------------------------------------------
    console.log('\n[Test 7] Editing the created record and verifying update...');
    const editBtn = await createdRow.findElement(By.css('.btn-edit'));
    await editBtn.click();

    const nameInput = await driver.findElement(By.id('input-name'));
    await nameInput.clear();
    await nameInput.sendKeys(testRecord.updatedName);
    await driver.findElement(By.id('btn-submit')).click();

    // Wait until the updated name is visible in the table row
    await driver.wait(async () => {
      const rows = await driver.findElements(rowSelector);
      if (rows.length === 0) return false;
      const text = await rows[0].getText();
      return text.includes(testRecord.updatedName);
    }, WAIT_TIMEOUT, 'Updated name did not appear in the table row within timeout.');
    console.log(' -> PASSED: Record updated to:', testRecord.updatedName);

    // -----------------------------------------------------------------
    // TEST 8: Delete the Record and Verify Removal
    // -----------------------------------------------------------------
    console.log('\n[Test 8] Deleting the test record and verifying removal...');
    const updatedRow = await driver.findElement(rowSelector);
    const deleteBtn = await updatedRow.findElement(By.css('.btn-delete'));
    await deleteBtn.click();

    await driver.wait(async () => {
      const remaining = await driver.findElements(rowSelector);
      return remaining.length === 0;
    }, WAIT_TIMEOUT, 'Deleted row still present in DOM.');
    console.log(' -> PASSED: Record deleted and removed from table.');

    // TEST 9: Search with no matches shows the empty-state row
    console.log('\n[Test 9] Searching for text that cannot match...');
    const s2 = await driver.findElement(By.id('search-input'));
    await s2.clear();
    await s2.sendKeys('zzz-no-such-record-' + uniqueSuffix);
    await driver.wait(until.elementLocated(By.id('empty-state-row')), WAIT_TIMEOUT);
    console.log(' -> PASSED: Empty-state row shown for no matches.');

    console.log('\n==========================================================');
    console.log(' ALL 9 SELENIUM TESTS COMPLETED SUCCESSFULLY');
    console.log('==========================================================');
  } catch (error) {
    console.error('\n[TEST FAILURE]:', error.message);
    process.exitCode = 1;
  } finally {
    // Cleanup: remove the test record if a failure left it behind (needs Node 18+ for fetch)
    try {
      const res = await fetch(APP_URL + '/api/students');
      const body = await res.json();
      for (const s of body.data || []) {
        if (s.rollNo === testRecord.rollNo) await fetch(APP_URL + '/api/students/' + s._id, { method: 'DELETE' });
      }
    } catch (e) { /* cleanup is best effort */ }
    if (driver) {
      await driver.quit();
    }
  }
}

runTests();
```

## `tests/README.md`

```markdown
# Selenium WebDriver Tests

Startup order: (1) MongoDB (local service or Atlas URI in `backend/.env`), (2) `cd backend; npm start` (wait for "[Server] Running"), (3) tests.

    cd tests
    npm install
    npm test

Optional: `$env:APP_URL="http://localhost:5000"` to change the target. Needs Chrome or Edge (Selenium Manager fetches the driver).
Covers: page load, empty-form validation, create, search, view, edit, delete, empty-search state. Test data is unique per run and cleaned up.
```

## `xml-demo/students.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="formatter.xsl"?>
<!-- CHANGE HERE: Update DOCTYPE root element and external DTD filename if renamed. -->
<!DOCTYPE students SYSTEM "students.dtd">

<!-- CHANGE HERE: Update XML elements and attributes to match the new scenario. -->
<students>
  <student id="STU-101" status="Active">
    <name>Ananya Sharma</name>
    <rollNo>CS2026-101</rollNo>
    <department>Computer Science</department>
    <email>ananya.sharma@college.edu</email>
    <year>3</year>
  </student>

  <student id="STU-102" status="Active">
    <name>Karthik Sundaram</name>
    <rollNo>EC2026-204</rollNo>
    <department>Electronics</department>
    <email>karthik.s@college.edu</email>
    <year>2</year>
  </student>

  <student id="STU-103" status="Graduating">
    <name>Meera Nair</name>
    <rollNo>ME2026-309</rollNo>
    <department>Mechanical</department>
    <email>meera.nair@college.edu</email>
    <year>4</year>
  </student>

  <student id="STU-104" status="Active">
    <name>Vikramaditya Rao</name>
    <rollNo>IT2026-118</rollNo>
    <department>Information Technology</department>
    <email>vikram.rao@college.edu</email>
    <year>1</year>
  </student>
</students>
```

## `xml-demo/students.dtd`

```xml
<!-- =====================================================================
     EXTERNAL DTD FOR XML DEMONSTRATION (xml-demo/students.dtd)
     CHANGE HERE: Update DTD element and attribute declarations for the new scenario.
     ===================================================================== -->

<!ELEMENT students (student+)>
<!ELEMENT student (name, rollNo, department, email, year)>

<!ATTLIST student
  id ID #REQUIRED
  status (Active | Graduating | Leave) "Active"
>

<!ELEMENT name (#PCDATA)>
<!ELEMENT rollNo (#PCDATA)>
<!ELEMENT department (#PCDATA)>
<!ELEMENT email (#PCDATA)>
<!ELEMENT year (#PCDATA)>
```

## `xml-demo/formatter.xsl`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <!-- CHANGE HERE: Update the XSLT output report title. -->
        <title>Student Directory — XML/XSLT Report</title>
        <style>
          /* CHANGE HERE: Customize XSLT report colors (white, black, grey and green). */
          body {
            font-family: Arial, Helvetica, sans-serif;
            background-color: #F5F5F5;
            color: #212121;
            margin: 0;
            padding: 32px 20px;
          }
          .report-wrapper {
            max-width: 960px;
            margin: 0 auto;
            background-color: #FFFFFF;
            border: 1px solid #BDBDBD;
            border-radius: 6px;
            padding: 24px;
            
          }
          h1 {
            margin: 0 0 6px 0;
            font-size: 1.4rem;
            color: #212121;
          }
          p.subtitle {
            margin: 0 0 20px 0;
            color: #616161;
            font-size: 0.92rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.92rem;
          }
          th, td {
            text-align: left;
            padding: 11px 12px;
            border-bottom: 1px solid #BDBDBD;
          }
          th {
            background-color: #EEEEEE;
            color: #616161;
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 0.03em;
          }
          tr:hover {
            background-color: #F5F5F5;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            background-color: #E8F5E9;
            color: #1B5E20;
            border: 1px solid #2E7D32;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
          }
          .summary-footer {
            margin-top: 16px;
            font-size: 0.88rem;
            color: #616161;
          }
        </style>
      </head>
      <body>
        <div class="report-wrapper">
          <!-- CHANGE HERE: Update report header text for the new scenario. -->
          <h1>Student Academic Registry (XML + DTD + XSLT Demonstration)</h1>
          <p class="subtitle">Formatted automatically from students.xml using formatter.xsl</p>

          <table>
            <thead>
              <!-- CHANGE HERE: Update table headers to match the XML fields. -->
              <tr>
                <th>Record ID</th>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Department</th>
                <th>Official Email</th>
                <th>Year</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <!-- CHANGE HERE: Update XPath expression and xsl:value-of field selections. -->
              <xsl:for-each select="students/student">
                <xsl:sort select="rollNo" order="ascending"/>
                <tr>
                  <td><xsl:value-of select="@id"/></td>
                  <td><strong><xsl:value-of select="rollNo"/></strong></td>
                  <td><xsl:value-of select="name"/></td>
                  <td><xsl:value-of select="department"/></td>
                  <td><xsl:value-of select="email"/></td>
                  <td>Year <xsl:value-of select="year"/></td>
                  <td>
                    <span class="badge">
                      <xsl:value-of select="@status"/>
                    </span>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>

          <div class="summary-footer">
            Total XML Records Displayed: <strong><xsl:value-of select="count(students/student)"/></strong>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
```

## `xml-demo/README.md`

```markdown
# Standalone XML, DTD, and XSLT Demonstration

This folder is completely independent of the Node.js backend and MongoDB database.

## Files Included
- `students.xml` — Well-formed XML data containing student records.
- `students.dtd` — External Document Type Definition validating `students.xml`.
- `formatter.xsl` — XSLT 1.0 stylesheet that renders `students.xml` into a styled HTML table.

## How to View the Formatted XSLT Output on Windows
Modern browsers (Chrome, Edge, Firefox) block local `file://` XSLT stylesheets for security reasons (showing a blank page if double-clicked directly). Use either of these simple methods during your practical exam:

### Method 1: Serve with `npx http-server` (Recommended)
Open PowerShell or Command Prompt inside the `xml-demo/` directory and run:

    npx --yes http-server -p 8080 -c-1

Then open `http://localhost:8080/students.xml` in Chrome, Edge, or Firefox.

### Method 2: VS Code Live Server Extension
Right-click `xml-demo/students.xml` in Visual Studio Code and select **Open with Live Server**.
```
