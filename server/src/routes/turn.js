const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];

  if (process.env.TURN_SERVER && process.env.TURN_SERVER !== 'turn:your-turn-server.com:3478') {
    iceServers.push({
      urls: process.env.TURN_SERVER,
      username: process.env.TURN_USERNAME || 'guest',
      credential: process.env.TURN_PASSWORD || 'guest'
    });
  }

  res.json({ iceServers });
});

module.exports = router;
