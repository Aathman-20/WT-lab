const mongoose = require('mongoose');

const connectDB = async () => {
  // CHANGE HERE: Configure local MongoDB or Atlas in backend/.env (fallback provided for exam safety).
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/practicalDB';

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
    console.log(`[MongoDB] Active database: ${conn.connection.name}`);
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error.message);
    console.error('Ensure local MongoDB service (mongod) is running or verify your Atlas MONGODB_URI.');
    process.exit(1);
  }
};

module.exports = connectDB;