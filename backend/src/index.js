const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initWebSocket } = require('./services/wsService');
const { query } = require('./db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const kioskRoutes = require('./routes/kioskRoutes');
const intakeRoutes = require('./routes/intakeRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded medical documents statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AYUSH / General OPD Case-Taking API (PS 047)'
  });
});

// Public hospital listing (for kiosk and patient login picker)
app.get('/api/hospitals/public', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, address, contact_phone, registration_mode FROM hospitals ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/kiosk', kioskRoutes);
app.use('/api/intake', intakeRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// Initialize Native WebSocket server on HTTP server
initWebSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` MEDIKIOSK OPD BACKEND RUNNING ON http://localhost:${PORT}`);
  console.log(` Native WebSocket server listening on ws://localhost:${PORT}/ws`);
  console.log(`======================================================\n`);
});
