require('dotenv').config();
require('reflect-metadata');

// CONFIG
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { AppDataSource } = require('./database/data-source');
const { startEmailQueueWorker, stopEmailQueueWorker } = require('./services/emailQueueService');

// ROUTES
const authRoutes = require('./routes/auth');
const seasonRoutes = require('./routes/seasons');
const seasonDatesRoutes = require('./routes/seasonDates');
const userRoutes = require('./routes/users');
const guardianRoutes = require('./routes/guardians');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const teamsRoutes = require('./routes/teams');
const sensitiveDataAdminRoutes = require('./routes/sensitiveDataAdmin');
const studentImportRoutes = require('./routes/studentImport');
const mentorAttendanceRoutes = require('./routes/mentorAttendance');
const notificationPreferencesRoutes = require('./routes/notificationPreferences');
const mailAuditRoutes = require('./routes/mailAudit');

// SERVER
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// MORGAN - formato personalizado que ignora OPTIONS
const morgan = require('morgan');
const customFormat = ':method :url :status :res[content-length] - :response-time ms';
const skipOptions = (req) => req.method === 'OPTIONS';
app.use(morgan(customFormat, { skip: skipOptions }));

// APP
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
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
app.use('/api/admin/sensitive-data', sensitiveDataAdminRoutes);
app.use('/api/admin/student-import', studentImportRoutes);
app.use('/api/mentor-attendance', mentorAttendanceRoutes);
app.use('/api/notification-preferences', notificationPreferencesRoutes);
app.use('/api/admin/mail-audit', mailAuditRoutes);

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

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.APP_URL;

AppDataSource.initialize()
  .then(() => {
    console.log('Database connected');
    startEmailQueueWorker();

    httpServer.listen(PORT, HOST, () => {
      console.log(`Server running on ${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });

function shutdown() {
  stopEmailQueueWorker();
  httpServer.close(() => AppDataSource.destroy().finally(() => process.exit(0)));
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
