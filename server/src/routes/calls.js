const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, callController.getCallHistory);
router.post('/', authMiddleware, callController.logCall);

module.exports = router;
