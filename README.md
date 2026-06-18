# 🌿 Umas Wellness Spa - Luxury Spa Booking System

🔗 **Live Demo**: [umas-wellness-spa.onrender.com](https://umas-wellness-spa.onrender.com)

Welcome to the **Umas Wellness Spa** web application. This is a fully functional, high-performance, and visually stunning single-page booking application designed to manage luxury spa reservations. It features secure user authentication, an interactive service catalog, dynamic scheduling, and a database-backed dashboard.

---

## ✨ Features

- **🌸 Premium User Interface**: A modern, responsive landing page utilizing a cohesive luxury color palette, elegant typography, smooth scrolling, and hover animations.
- **🔐 User Authentication**: Secure client registration, login, and session tracking using password hashing (`bcryptjs`) and cookie-based sessions (`express-session`).
- **📅 Dynamic Slot Booking**:
  - Automatically lists available appointments in 30-minute intervals between **9:00 AM and 10:00 PM**.
  - Restricts double-booking (prevents overlapping sessions for the same treatment room or the same user).
  - Dynamically calculates price scaling based on chosen duration (30 mins vs 60 mins).
- **🎛️ Interactive Catalog**: Category filters (Basic, Intermediate, Premium) that dynamically display spa treatments.
- **💼 Personal Client Dashboard**: Displays upcoming reservations with options to cancel sessions in real-time.

---

## 🛠️ Tech Stack

### Frontend
- **HTML5 & CSS3**: Custom responsive styling, transitions, layouts, and modals.
- **Vanilla JavaScript**: Controls client state, processes forms, triggers notifications, and fetches schedules dynamically via APIs.

### Backend
- **Node.js**: Server runtime.
- **Express.js**: Backend framework hosting RESTful API endpoints.

### Database
- **SQLite**: A file-based relational database (`spa.db`) storing tables for `users`, `services`, and `bookings`.

---

## 🚀 How to Run Locally

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your computer.

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/umavignesh13/umas-wellness-spa.git
   cd umas-wellness-spa
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   node server.js
   ```

4. **Access the application:**
   Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

---

## 📁 File Structure

```text
├── public/                  # Frontend assets
│   ├── images/              # Treatment cover images
│   ├── app.js               # Client-side UI & fetch logic
│   ├── index.html           # Main Single-page structure
│   └── style.css            # Styling & responsiveness
├── db.js                    # Database setup, tables, & seeding scripts
├── server.js                # Express API endpoints & sessions
├── package.json             # Project metadata & dependency list
└── README.md                # Project documentation
```
