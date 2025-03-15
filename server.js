require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to SQLite database
const dbPath = path.join(__dirname, 'admissions.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error connecting to database:", err.message);
    } else {
        console.log("Connected to SQLite database");
    }
});

// Create table if not exists
db.run(`
    CREATE TABLE IF NOT EXISTS admissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_name TEXT,
        dob TEXT,
        school_name TEXT,
        class_studying TEXT,
        syllabus TEXT,
        transfer_type TEXT,
        father_name TEXT,
        mother_name TEXT,
        photo_path TEXT,
        synced INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) console.error("Error creating table:", err.message);
});

// 🟢 API Route: Get all admissions
app.get('/admissions', (req, res) => {
    db.all('SELECT * FROM admissions', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 🟢 API Route: Add a new admission
app.post('/admissions', (req, res) => {
    const {
        student_name, dob, school_name, class_studying, syllabus,
        transfer_type, father_name, mother_name, photo_path
    } = req.body;

    db.run(`
        INSERT INTO admissions (student_name, dob, school_name, class_studying, syllabus, transfer_type, father_name, mother_name, photo_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [student_name, dob, school_name, class_studying, syllabus, transfer_type, father_name, mother_name, photo_path], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Admission added successfully", id: this.lastID });
    });
});

// 🟢 API Route: Mark admission as synced
app.put('/admissions/:id/sync', (req, res) => {
    const id = req.params.id;
    db.run(`UPDATE admissions SET synced = 1 WHERE id = ?`, [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Admission marked as synced" });
    });
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});