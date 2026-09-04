const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

let wss = null;
// Maps: roomName -> Set of WebSocket clients
const rooms = new Map();

/**
 * Initialize Native WebSocket Server (No Socket.io per spec PRD)
 */
function initWebSocket(server) {
  wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    const parameters = url.parse(req.url, true).query;
    let clientHospitalId = null;
    let clientCaseId = null;

    // Doctor client: authenticate via token query param
    if (parameters.token) {
      try {
        const decoded = jwt.verify(parameters.token, JWT_SECRET);
        if (decoded.hospital_id) {
          clientHospitalId = decoded.hospital_id;
          joinRoom(`hospital:${clientHospitalId}`, ws);
          // console.log(`[WS] Doctor subscribed to hospital:${clientHospitalId}`);
        }
      } catch (err) {
        // console.log('[WS] Doctor token invalid:', err.message);
      }
    }

    // Patient waiting client: subscribe narrowly to case:{case_id}
    if (parameters.case_id) {
      clientCaseId = parameters.case_id;
      joinRoom(`case:${clientCaseId}`, ws);
      // console.log(`[WS] Patient subscribed to case:${clientCaseId}`);
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.action === 'subscribe_hospital' && data.hospital_id) {
          joinRoom(`hospital:${data.hospital_id}`, ws);
        } else if (data.action === 'subscribe_case' && data.case_id) {
          joinRoom(`case:${data.case_id}`, ws);
        }
      } catch (e) {
        // ignore non-json
      }
    });

    ws.on('close', () => {
      leaveAllRooms(ws);
    });

    ws.send(JSON.stringify({ event: 'connected', message: 'WebSocket real-time channel ready' }));
  });

  console.log('[WebSocket] Native WS server initialized on /ws');
  return wss;
}

function joinRoom(roomName, ws) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
  }
  rooms.get(roomName).add(ws);
}

function leaveAllRooms(ws) {
  for (const [roomName, clientSet] of rooms.entries()) {
    if (clientSet.has(ws)) {
      clientSet.delete(ws);
      if (clientSet.size === 0) {
        rooms.delete(roomName);
      }
    }
  }
}

/**
 * Emit event to a specific room
 * Exactly two justified use cases:
 * 1. Doctor queue push: emitToRoom(`hospital:${hospital_id}`, { event: 'case_ready', ... })
 * 2. Patient turn notification: emitToRoom(`case:${case_id}`, { event: 'your_turn', ... })
 */
function emitToRoom(roomName, payload) {
  const clientSet = rooms.get(roomName);
  if (clientSet) {
    const msg = JSON.stringify(payload);
    for (const ws of clientSet) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  }
}

module.exports = {
  initWebSocket,
  emitToRoom
};
