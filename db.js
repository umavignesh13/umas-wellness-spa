const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'spa.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
  }
});

// Enable foreign key support
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON;', (err) => {
    if (err) console.error('Error enabling foreign keys:', err);
  });

  // Create Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Services table
  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      image_path TEXT
    )
  `);

  // Create Bookings table
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      booking_date TEXT NOT NULL,
      booking_time TEXT NOT NULL,
      duration INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
    )
  `, () => {
    // Seed default services if they don't exist
    seedServices();
  });
});

function seedServices() {
  db.get('SELECT COUNT(*) AS count FROM services', (err, row) => {
    if (err) {
      console.error('Error checking services count:', err.message);
      return;
    }

    if (row.count === 0) {
      const defaultServices = [
        {
          name: 'Swedish Massage',
          category: 'Basic',
          price: 1800.00,
          description: 'A classic full-body relaxation massage using long strokes to reduce stress, improve blood flow, and relieve light tension.',
          image_path: '/images/swedish_massage.png'
        },
        {
          name: 'Quick Reflexology',
          category: 'Basic',
          price: 1200.00,
          description: 'A targeted massage technique focusing on key pressure points in the hands and feet to restore energy flow and soothe tired muscles.',
          image_path: '/images/reflexology.png'
        },
        {
          name: 'Aromatherapy Massage',
          category: 'Intermediate',
          price: 2400.00,
          description: 'Combines the healing powers of customized organic essential oil blends with gentle massage to nourish your skin and calm the mind.',
          image_path: '/images/aromatherapy.png'
        },
        {
          name: 'Deep Tissue Massage',
          category: 'Intermediate',
          price: 2800.00,
          description: 'Slow, firm strokes targeting deep muscle layers. Highly recommended for chronic pain, athletic recovery, or intense muscle tightness.',
          image_path: '/images/deep_tissue.png'
        },
        {
          name: 'Hot Stone Therapy',
          category: 'Premium',
          price: 3500.00,
          description: 'Polished volcanic basalt stones are heated and placed on key energy centers, paired with deep massage to melt away stress.',
          image_path: '/images/hot_stone.png'
        },
        {
          name: 'Royal Facial & Spa',
          category: 'Premium',
          price: 4500.00,
          description: 'Our ultimate luxury combination: an exfoliating, organic facial rejuvenation combined with a luxurious neck, shoulder, and scalp massage.',
          image_path: '/images/royal_facial.png'
        }
      ];

      const stmt = db.prepare('INSERT INTO services (name, category, price, description, image_path) VALUES (?, ?, ?, ?, ?)');
      defaultServices.forEach(s => {
        stmt.run(s.name, s.category, s.price, s.description, s.image_path, (stmtErr) => {
          if (stmtErr) {
            console.error(`Error inserting service ${s.name}:`, stmtErr.message);
          }
        });
      });
      stmt.finalize(() => {
        console.log('Seeded default services into database.');
      });
    }
  });
}

// Wrapper functions for promise-based queries
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  db,
  run,
  get,
  all
};
