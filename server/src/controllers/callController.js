const { v4: uuidv4 } = require('uuid');
const pool = require('../database/connection');

const getCallHistory = async (req, res) => {
  try {
    const [calls] = await pool.query(
      `SELECT 
        ch.id,
        ch.caller_id,
        ch.receiver_id,
        ch.call_type,
        ch.status,
        ch.duration,
        ch.started_at,
        ch.ended_at,
        u.id as other_user_id,
        u.username,
        u.display_name,
        u.avatar_url
      FROM call_history ch
      JOIN users u ON (ch.caller_id != u.id AND (ch.caller_id = ? OR ch.receiver_id = ?))
      WHERE ch.caller_id = ? OR ch.receiver_id = ?
      ORDER BY ch.started_at DESC
      LIMIT 50`,
      [req.user.id, req.user.id, req.user.id, req.user.id]
    );

    res.json(calls.map(c => ({
      id: c.id,
      callerId: c.caller_id,
      receiverId: c.receiver_id,
      otherUserId: c.other_user_id,
      otherUsername: c.username,
      otherDisplayName: c.display_name,
      otherAvatarUrl: c.avatar_url,
      callType: c.call_type,
      status: c.status,
      duration: c.duration,
      startedAt: c.started_at,
      endedAt: c.ended_at,
      isIncoming: c.receiver_id === req.user.id
    })));
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ error: 'Failed to get call history' });
  }
};

const logCall = async (req, res) => {
  try {
    const { receiverId, callType, status, duration } = req.body;

    if (!receiverId || !callType || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const callId = uuidv4();
    const now = new Date();
    const endedAt = duration ? new Date(now.getTime() + duration * 1000) : now;

    await pool.query(
      'INSERT INTO call_history (id, caller_id, receiver_id, call_type, status, duration, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [callId, req.user.id, receiverId, callType, status, duration || 0, now, endedAt]
    );

    res.json({ message: 'Call logged', callId });
  } catch (error) {
    console.error('Log call error:', error);
    res.status(500).json({ error: 'Failed to log call' });
  }
};

module.exports = { getCallHistory, logCall };
