require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const dbPath = path.join(__dirname, 'admissions.db');
let db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("❌ Failed to connect to database:", err.message);
        process.exit(1);
    } else {
        console.log(`✅ Connected to SQLite database at ${dbPath}`);
    }
});

// Ensure the table exists
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
    if (err) {
        console.error("❌ Error creating admissions table:", err.message);
    } else {
        console.log("✅ Admissions table is ready.");
    }
});

// Middleware for logging requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ status: "API is running", database: dbPath });
});

// Get all admissions
app.get('/admissions', (req, res) => {
    db.all('SELECT * FROM admissions', [], (err, rows) => {
        if (err) {
            console.error("❌ Error fetching admissions:", err.message);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.json(rows);
        }
    });
});

// Add a new admission
app.post('/admissions', (req, res) => {
    const {
        student_name, dob, school_name, class_studying, syllabus,
        transfer_type, father_name, mother_name, photo_path
    } = req.body;

    if (!student_name || !dob || !school_name) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const stmt = db.prepare(`
        INSERT INTO admissions (student_name, dob, school_name, class_studying, syllabus, transfer_type, father_name, mother_name, photo_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(student_name, dob, school_name, class_studying, syllabus, transfer_type, father_name, mother_name, photo_path, function (err) {
        if (err) {
            console.error("❌ Error adding admission:", err.message);
            res.status(500).json({ error: "Failed to add admission" });
        } else {
            res.status(201).json({ message: "Admission added successfully", id: this.lastID });
        }
    });
});

// Mark admission as synced
app.put('/admissions/:id/sync', (req, res) => {
    const id = req.params.id;
    db.run(`UPDATE admissions SET synced = 1 WHERE id = ?`, id, function (err) {
        if (err) {
            console.error("❌ Error marking admission as synced:", err.message);
            res.status(500).json({ error: "Internal Server Error" });
        } else if (this.changes === 0) {
            res.status(404).json({ error: "Admission not found" });
        } else {
            res.json({ message: "Admission marked as synced" });
        }
    });
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});