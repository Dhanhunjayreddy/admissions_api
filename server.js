require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const dbPath = path.join(__dirname, 'admissions.db');
let db;

try {
    db = new Database(dbPath, { verbose: console.log });
    console.log(`✅ Connected to SQLite database at ${dbPath}`);
} catch (error) {
    console.error("❌ Failed to connect to database:", error.message);
    process.exit(1);
}

// Ensure the table exists
try {
    db.prepare(`
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
    `).run();
    console.log("✅ Admissions table is ready.");
} catch (err) {
    console.error("❌ Error creating admissions table:", err.message);
}

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
    try {
        const rows = db.prepare('SELECT * FROM admissions').all();
        res.json(rows);
    } catch (err) {
        console.error("❌ Error fetching admissions:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Add a new admission
app.post('/admissions', (req, res) => {
    try {
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
        const info = stmt.run(student_name, dob, school_name, class_studying, syllabus, transfer_type, father_name, mother_name, photo_path);

        res.status(201).json({ message: "Admission added successfully", id: info.lastInsertRowid });
    } catch (err) {
        console.error("❌ Error adding admission:", err.message);
        res.status(500).json({ error: "Failed to add admission" });
    }
});

// Mark admission as synced
app.put('/admissions/:id/sync', (req, res) => {
    try {
        const id = req.params.id;
        const result = db.prepare(`UPDATE admissions SET synced = 1 WHERE id = ?`).run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: "Admission not found" });
        }

        res.json({ message: "Admission marked as synced" });
    } catch (err) {
        console.error("❌ Error marking admission as synced:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});