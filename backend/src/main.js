require('dotenv').config();
require('reflect-metadata');

// CONFIG
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { AppDataSource } = require('./database/data-source');

// ROUTES
const authRoutes = require('./routes/auth');
const seasonRoutes = require('./routes/seasons');
const seasonDatesRoutes = require('./routes/seasonDates');
const userRoutes = require('./routes/users');
const guardianRoutes = require('./routes/guardians');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const teamsRoutes = require('./routes/teams');

// SERVER
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// MORGAN
app.use(require("morgan")("dev"));

// APP
app.use(cors());
app.use(express.json());

// Make socket.io accessible from route handlers via req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/seasons', seasonDatesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/guardians', guardianRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/teams', teamsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-season', (seasonId) => {
    socket.join(`season:${seasonId}`);
    console.log(`Socket ${socket.id} joined season:${seasonId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    console.log('Database connected');
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
  });