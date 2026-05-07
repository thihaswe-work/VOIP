const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const authMiddleware = require('../middleware/auth');

router.get('/search', authMiddleware, contactController.searchUsers);
router.get('/', authMiddleware, contactController.getContacts);
router.post('/', authMiddleware, contactController.addContact);
router.delete('/:contactId', authMiddleware, contactController.removeContact);

module.exports = router;
