const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: 'spa-luxury-secret-key-987654321',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Convert time string "HH:MM" to minutes from midnight
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Convert minutes from midnight back to "HH:MM"
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// ----------------------------------------
// AUTHENTICATION ENDPOINTS
// ----------------------------------------

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password, phone } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already registered.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await db.run(
      'INSERT INTO users (username, email, password, phone) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, phone || null]
    );

    // Auto-login after signup
    req.session.userId = result.id;
    req.session.username = username;

    res.status(201).json({ message: 'Registration successful', user: { id: result.id, username, email, phone } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { loginId, password } = req.body; // loginId can be username or email

  if (!loginId || !password) {
    return res.status(400).json({ error: 'Credentials and password are required.' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE username = ? OR email = ?', [loginId, loginId]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ message: 'Login successful', user: { id: user.id, username: user.username, email: user.email, phone: user.phone } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out.' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Get Current User (Session Check)
app.get('/api/auth/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = await db.get('SELECT id, username, email, phone FROM users WHERE id = ?', [req.session.userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ----------------------------------------
// SERVICE ENDPOINTS
// ----------------------------------------

// Get Services Catalog
app.get('/api/services', async (req, res) => {
  try {
    const services = await db.all('SELECT * FROM services');
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services.' });
  }
});

// ----------------------------------------
// BOOKING ENDPOINTS
// ----------------------------------------

// Get Available Slots
// GET /api/bookings/available-slots?date=YYYY-MM-DD&serviceId=1&duration=30
app.get('/api/bookings/available-slots', async (req, res) => {
  const { date, serviceId, duration } = req.query;

  if (!date || !serviceId || !duration) {
    return res.status(400).json({ error: 'Date, serviceId, and duration are required.' });
  }

  const durationMin = parseInt(duration);
  if (isNaN(durationMin) || durationMin < 30 || durationMin % 30 !== 0) {
    return res.status(400).json({ error: 'Duration must be a multiple of 30 minutes (minimum 30 minutes).' });
  }

  try {
    // Get existing bookings for this service on this date
    const bookings = await db.all(
      'SELECT booking_time, duration FROM bookings WHERE service_id = ? AND booking_date = ?',
      [serviceId, date]
    );

    // Setup operating hours: 9:00 AM (540 mins) to 10:00 PM (1320 mins)
    const openTime = 9 * 60;   // 540
    const closeTime = 22 * 60; // 1320
    const slots = [];

    // Increment in 30-min intervals
    for (let current = openTime; current + durationMin <= closeTime; current += 30) {
      const slotStart = current;
      const slotEnd = current + durationMin;

      // Check for overlap with existing bookings
      // Overlap: start1 < end2 AND start2 < end1
      let isOverlapping = false;
      for (const booking of bookings) {
        const bStart = timeToMinutes(booking.booking_time);
        const bEnd = bStart + booking.duration;

        if (slotStart < bEnd && bStart < slotEnd) {
          isOverlapping = true;
          break;
        }
      }

      slots.push({
        time: minutesToTime(slotStart),
        available: !isOverlapping
      });
    }

    res.json(slots);
  } catch (err) {
    console.error('Available slots calculation error:', err);
    res.status(500).json({ error: 'Failed to calculate available slots.' });
  }
});

// Create Booking
app.post('/api/bookings', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Sign in to book a session.' });
  }

  const { serviceId, bookingDate, bookingTime, duration } = req.body;
  const userId = req.session.userId;

  if (!serviceId || !bookingDate || !bookingTime || !duration) {
    return res.status(400).json({ error: 'Missing booking details.' });
  }

  const durationMin = parseInt(duration);
  if (isNaN(durationMin) || durationMin < 30 || durationMin % 30 !== 0) {
    return res.status(400).json({ error: 'Duration must be a multiple of 30 minutes (minimum 30 minutes).' });
  }

  // Validate timing range (9:00 AM - 10:00 PM)
  const proposedStart = timeToMinutes(bookingTime);
  const proposedEnd = proposedStart + durationMin;
  const openTime = 9 * 60;
  const closeTime = 22 * 60;

  if (proposedStart < openTime || proposedEnd > closeTime) {
    return res.status(400).json({ error: 'Booking time must be within operating hours (9:00 AM - 10:00 PM).' });
  }

  // Prevent booking past dates
  const today = new Date().toISOString().split('T')[0];
  if (bookingDate < today) {
    return res.status(400).json({ error: 'Cannot book slots in the past.' });
  }

  try {
    // 1. Verify Service Exists
    const service = await db.get('SELECT * FROM services WHERE id = ?', [serviceId]);
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    // 2. Check overlap for the same service
    const serviceBookings = await db.all(
      'SELECT booking_time, duration FROM bookings WHERE service_id = ? AND booking_date = ?',
      [serviceId, bookingDate]
    );

    let serviceConflict = false;
    for (const b of serviceBookings) {
      const bStart = timeToMinutes(b.booking_time);
      const bEnd = bStart + b.duration;
      if (proposedStart < bEnd && bStart < proposedEnd) {
        serviceConflict = true;
        break;
      }
    }

    if (serviceConflict) {
      return res.status(400).json({ error: 'The selected time slot is no longer available for this service.' });
    }

    // 3. Check overlap for the same user (prevent user double booking)
    const userBookings = await db.all(
      'SELECT booking_time, duration FROM bookings WHERE user_id = ? AND booking_date = ?',
      [userId, bookingDate]
    );

    let userConflict = false;
    for (const b of userBookings) {
      const bStart = timeToMinutes(b.booking_time);
      const bEnd = bStart + b.duration;
      if (proposedStart < bEnd && bStart < proposedEnd) {
        userConflict = true;
        break;
      }
    }

    if (userConflict) {
      return res.status(400).json({ error: 'You already have another session booked during this time interval.' });
    }

    // 4. Save Booking
    const result = await db.run(
      'INSERT INTO bookings (user_id, service_id, booking_date, booking_time, duration) VALUES (?, ?, ?, ?, ?)',
      [userId, serviceId, bookingDate, bookingTime, durationMin]
    );

    res.status(201).json({
      message: 'Booking confirmed successfully!',
      booking: {
        id: result.id,
        serviceName: service.name,
        bookingDate,
        bookingTime,
        duration: durationMin
      }
    });
  } catch (err) {
    console.error('Booking creation error:', err);
    res.status(500).json({ error: 'Server error while processing booking.' });
  }
});

// Get User Bookings
app.get('/api/bookings/my', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const userBookings = await db.all(`
      SELECT b.id, b.booking_date, b.booking_time, b.duration, b.created_at,
             s.name AS service_name, s.category AS service_category, s.price AS service_price
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.user_id = ?
      ORDER BY b.booking_date ASC, b.booking_time ASC
    `, [req.session.userId]);

    res.json(userBookings);
  } catch (err) {
    console.error('Fetch user bookings error:', err);
    res.status(500).json({ error: 'Failed to retrieve bookings.' });
  }
});

// Cancel Booking
app.delete('/api/bookings/:id', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const bookingId = req.params.id;
  const userId = req.session.userId;

  try {
    // Verify booking belongs to user
    const booking = await db.get('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [bookingId, userId]);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or not authorized.' });
    }

    await db.run('DELETE FROM bookings WHERE id = ?', [bookingId]);
    res.json({ message: 'Booking cancelled successfully.' });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Failed to cancel booking.' });
  }
});

// No catch-all needed for hash-based single-page-app layout

// Start Server
app.listen(PORT, () => {
  console.log(`Spa Booking Server running on http://localhost:${PORT}`);
});
