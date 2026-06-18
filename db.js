const { Pool } = require('pg');
const path = require('path');

const isPostgres = !!process.env.DATABASE_URL;

let pool;
let sqliteDb;

// Initialize Database connection based on environment
if (isPostgres) {
  console.log('Production: Connecting to PostgreSQL database...');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for hosted services like Neon/Supabase
    }
  });
  
  initPostgres();
} else {
  console.log('Local: Connecting to SQLite database...');
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'spa.db');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error connecting to the SQLite database:', err.message);
    } else {
      console.log('Connected to the SQLite database at:', dbPath);
    }
  });

  // Enable foreign key support and initialize tables
  sqliteDb.serialize(() => {
    sqliteDb.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) console.error('Error enabling foreign keys:', err);
    });

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        image_path TEXT
      )
    `);

    sqliteDb.run(`
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
      seedServicesSqlite();
    });
  });
}

// ----------------------------------------
// POSTGRESQL INITIALIZATION
// ----------------------------------------
async function initPostgres() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        category VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        description TEXT,
        image_path VARCHAR(255)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        booking_date VARCHAR(50) NOT NULL,
        booking_time VARCHAR(50) NOT NULL,
        duration INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await seedServicesPostgres();
  } catch (err) {
    console.error('Error initializing PostgreSQL tables:', err.message);
  }
}

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

// Seeding for SQLite
function seedServicesSqlite() {
  sqliteDb.get('SELECT COUNT(*) AS count FROM services', (err, row) => {
    if (err) {
      console.error('Error checking SQLite services count:', err.message);
      return;
    }
    if (row.count === 0) {
      const stmt = sqliteDb.prepare('INSERT INTO services (name, category, price, description, image_path) VALUES (?, ?, ?, ?, ?)');
      defaultServices.forEach(s => {
        stmt.run(s.name, s.category, s.price, s.description, s.image_path, (stmtErr) => {
          if (stmtErr) console.error(`Error inserting SQLite service ${s.name}:`, stmtErr.message);
        });
      });
      stmt.finalize(() => {
        console.log('Seeded default services into SQLite database.');
      });
    }
  });
}

// Seeding for PostgreSQL
async function seedServicesPostgres() {
  try {
    const res = await pool.query('SELECT COUNT(*) AS count FROM services');
    const count = parseInt(res.rows[0].count);
    if (count === 0) {
      for (const s of defaultServices) {
        await pool.query(
          'INSERT INTO services (name, category, price, description, image_path) VALUES ($1, $2, $3, $4, $5)',
          [s.name, s.category, s.price, s.description, s.image_path]
        );
      }
      console.log('Seeded default services into PostgreSQL database.');
    }
  } catch (err) {
    console.error('Error seeding PostgreSQL services:', err.message);
  }
}

// ----------------------------------------
// COMPATIBILITY TRANSLATION UTILITY
// ----------------------------------------
// Converts SQLite "?" placeholders to PostgreSQL "$1", "$2", etc.
// Automatically appends "RETURNING id" to INSERT statements to fetch inserted ID.
function translateSql(sql) {
  let index = 1;
  let newSql = sql.replace(/\?/g, () => `$${index++}`);
  
  if (newSql.trim().toUpperCase().startsWith('INSERT ')) {
    newSql += ' RETURNING id';
  }
  return newSql;
}

// ----------------------------------------
// PROMISE-BASED COMPATIBILITY API
// ----------------------------------------
async function run(sql, params = []) {
  if (isPostgres) {
    const pgSql = translateSql(sql);
    const res = await pool.query(pgSql, params);
    const lastID = res.rows[0]?.id || null;
    return { id: lastID, changes: res.rowCount };
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }
}

async function get(sql, params = []) {
  if (isPostgres) {
    const pgSql = translateSql(sql);
    const res = await pool.query(pgSql, params);
    // SQLite returns undefined if no rows are found, let's keep consistency
    return res.rows[0] || undefined;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
}

async function all(sql, params = []) {
  if (isPostgres) {
    const pgSql = translateSql(sql);
    const res = await pool.query(pgSql, params);
    return res.rows;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = {
  db: isPostgres ? pool : sqliteDb,
  run,
  get,
  all
};
