const { v4: uuidv4 } = require('uuid');
const pool = require('../database/connection');

const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const [users] = await pool.query(
      'SELECT id, username, display_name, avatar_url, phone_number, status FROM users WHERE (username LIKE ? OR display_name LIKE ?) AND id != ? LIMIT 20',
      [`%${query}%`, `%${query}%`, req.user.id]
    );

    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      phoneNumber: u.phone_number,
      status: u.status
    })));
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

const getContacts = async (req, res) => {
  try {
    const [contacts] = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.phone_number, u.status, c.alias 
       FROM contacts c 
       JOIN users u ON c.contact_id = u.id 
       WHERE c.user_id = ? 
       ORDER BY u.display_name`,
      [req.user.id]
    );

    res.json(contacts.map(c => ({
      id: c.id,
      username: c.username,
      displayName: c.alias || c.display_name,
      avatarUrl: c.avatar_url,
      phoneNumber: c.phone_number,
      status: c.status
    })));
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
};

const addContact = async (req, res) => {
  try {
    const { contactId } = req.body;
    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    if (contactId === req.user.id) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }

    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [contactId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query(
      'INSERT IGNORE INTO contacts (id, user_id, contact_id) VALUES (?, ?, ?)',
      [uuidv4(), req.user.id, contactId]
    );

    res.json({ message: 'Contact added' });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ error: 'Failed to add contact' });
  }
};

const removeContact = async (req, res) => {
  try {
    const { contactId } = req.params;

    await pool.query(
      'DELETE FROM contacts WHERE user_id = ? AND contact_id = ?',
      [req.user.id, contactId]
    );

    res.json({ message: 'Contact removed' });
  } catch (error) {
    console.error('Remove contact error:', error);
    res.status(500).json({ error: 'Failed to remove contact' });
  }
};

module.exports = { searchUsers, getContacts, addContact, removeContact };
