const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'mysql',
    password: process.env.MYSQL_PASSWORD || 'password',
    port: process.env.MYSQL_PORT || 3306
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DATABASE || 'p2p_calling'}`);
    console.log('Database created/verified');

    await connection.query(`USE ${process.env.MYSQL_DATABASE || 'p2p_calling'}`);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        avatar_url TEXT,
        phone_number VARCHAR(20),
        status VARCHAR(20) DEFAULT 'offline',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        contact_id VARCHAR(36) NOT NULL,
        alias VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_contact (user_id, contact_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Contacts table created');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS call_history (
        id VARCHAR(36) PRIMARY KEY,
        caller_id VARCHAR(36) NOT NULL,
        receiver_id VARCHAR(36) NOT NULL,
        call_type ENUM('voice', 'video') DEFAULT 'voice',
        status ENUM('completed', 'missed', 'rejected', 'cancelled') DEFAULT 'completed',
        duration INT DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL,
        FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Call history table created');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        sender_id VARCHAR(36) NOT NULL,
        receiver_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        type ENUM('text', 'image', 'file') DEFAULT 'text',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Messages table created');

    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  } finally {
    await connection.end();
  }
}

initDatabase();
