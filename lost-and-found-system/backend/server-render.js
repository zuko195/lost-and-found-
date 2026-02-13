const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const app = express();

// RENDER.COM COMPATIBLE: Use Render's PORT or default to 3000
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const SESSION_SECRET = process.env.SESSION_SECRET || 'session-secret-change-this';
const NODE_ENV = process.env.NODE_ENV || 'development';

// RENDER.COM COMPATIBLE: CORS configuration for multiple origins
const allowedOrigins = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:5000',
    process.env.FRONTEND_URL, // Render frontend URL
    'https://lost-found-frontend.onrender.com', // Replace with your actual Render frontend URL
];

// Middleware
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('onrender.com')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: NODE_ENV === 'production', // true in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files from frontend directory (if deployed together)
app.use(express.static(path.join(__dirname, '../frontend')));

// RENDER.COM COMPATIBLE: Database path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database/lost_and_found.db');

// Database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    const fs = require('fs');
    const schemaPath = path.join(__dirname, '../database/schema_with_auth.sql');
    
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        db.exec(schema, (err) => {
            if (err) {
                console.error('Error initializing database:', err.message);
            } else {
                console.log('Database initialized successfully with authentication.');
            }
        });
    }
}

// ============= AUTHENTICATION MIDDLEWARE =============

// Verify JWT token
function authenticateToken(req, res, next) {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. Please login.' });
    }
    
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
}

// Check if user is admin
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    next();
}

// Log admin actions
function logAdminAction(adminId, adminName, action, details = {}) {
    const { targetUserId, targetItemId, ip } = details;
    
    db.run(`
        INSERT INTO admin_logs (admin_id, admin_name, action, target_user_id, target_item_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [adminId, adminName, action, targetUserId, targetItemId, JSON.stringify(details), ip]);
}

// ============= HEALTH CHECK =============

app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Lost & Found API Server',
        version: '2.0.0',
        environment: NODE_ENV
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running with authentication',
        timestamp: new Date().toISOString()
    });
});

// ============= AUTHENTICATION ROUTES =============

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { full_name, email, student_id, phone, password, confirm_password } = req.body;
        
        if (!full_name || !email || !password) {
            return res.status(400).json({ error: 'Full name, email, and password are required' });
        }
        
        if (password !== confirm_password) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        db.get('SELECT * FROM users WHERE email = ? OR student_id = ?', [email, student_id], async (err, existingUser) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (existingUser) {
                return res.status(400).json({ error: 'User with this email or student ID already exists' });
            }
            
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            
            const query = `
                INSERT INTO users (full_name, email, student_id, phone, password_hash, role, login_method, is_verified, is_active)
                VALUES (?, ?, ?, ?, ?, 'student', 'email', 0, 1)
            `;
            
            db.run(query, [full_name, email, student_id, phone, password_hash], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                res.json({
                    success: true,
                    message: 'Registration successful! Please login.',
                    user_id: this.lastID
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.ip;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            db.run('INSERT INTO login_attempts (email_or_student_id, ip_address, success) VALUES (?, ?, ?)', 
                [email, ipAddress, user ? 1 : 0]);
            
            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            
            if (!user.is_active) {
                return res.status(403).json({ error: 'Account is deactivated. Contact administrator.' });
            }
            
            const validPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, student_id: user.student_id },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
            
            res.cookie('token', token, {
                httpOnly: true,
                secure: NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000
            });
            
            res.json({
                success: true,
                message: 'Login successful',
                token: token,
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    student_id: user.student_id,
                    role: user.role,
                    profile_picture: user.profile_picture
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
    db.get('SELECT id, full_name, email, student_id, phone, role, profile_picture, created_at, last_login FROM users WHERE id = ?', 
        [req.user.id], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true, user: user });
    });
});

// Change password
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password, confirm_password } = req.body;
        
        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }
        
        if (new_password !== confirm_password) {
            return res.status(400).json({ error: 'New passwords do not match' });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        db.get('SELECT * FROM users WHERE id = ?', [req.user.id], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const validPassword = await bcrypt.compare(current_password, user.password_hash);
            
            if (!validPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            
            const salt = await bcrypt.genSalt(10);
            const new_password_hash = await bcrypt.hash(new_password, salt);
            
            db.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                [new_password_hash, req.user.id], (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                res.json({ success: true, message: 'Password changed successfully' });
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= ADMIN ROUTES =============

app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    const { role, search } = req.query;
    let query = 'SELECT id, full_name, email, student_id, phone, role, is_active, created_at, last_login FROM users WHERE 1=1';
    const params = [];
    
    if (role) {
        query += ' AND role = ?';
        params.push(role);
    }
    
    if (search) {
        query += ' AND (full_name LIKE ? OR email LIKE ? OR student_id LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, params, (err, users) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, users: users });
    });
});

app.get('/api/admin/statistics', authenticateToken, requireAdmin, (req, res) => {
    db.get('SELECT * FROM admin_statistics', (err, stats) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, statistics: stats });
    });
});

app.put('/api/admin/users/:id/promote', authenticateToken, requireAdmin, (req, res) => {
    const userId = req.params.id;
    
    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'Cannot change your own role' });
    }
    
    db.run('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        ['admin', userId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        logAdminAction(req.user.id, req.user.email, 'PROMOTE_TO_ADMIN', {
            targetUserId: userId,
            ip: req.ip
        });
        
        res.json({ success: true, message: 'User promoted to admin successfully' });
    });
});

app.put('/api/admin/users/:id/demote', authenticateToken, requireAdmin, (req, res) => {
    const userId = req.params.id;
    
    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'Cannot change your own role' });
    }
    
    db.get('SELECT COUNT(*) as count FROM users WHERE role = "admin"', (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (result.count <= 1) {
            return res.status(400).json({ error: 'Cannot demote the last admin' });
        }
        
        db.run('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            ['student', userId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            logAdminAction(req.user.id, req.user.email, 'DEMOTE_TO_STUDENT', {
                targetUserId: userId,
                ip: req.ip
            });
            
            res.json({ success: true, message: 'Admin demoted to student successfully' });
        });
    });
});

app.put('/api/admin/users/:id/toggle-status', authenticateToken, requireAdmin, (req, res) => {
    const userId = req.params.id;
    
    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'Cannot ban yourself' });
    }
    
    db.get('SELECT is_active FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const newStatus = user.is_active ? 0 : 1;
        
        db.run('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [newStatus, userId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            logAdminAction(req.user.id, req.user.email, newStatus ? 'UNBAN_USER' : 'BAN_USER', {
                targetUserId: userId,
                ip: req.ip
            });
            
            res.json({ 
                success: true, 
                message: newStatus ? 'User unbanned successfully' : 'User banned successfully',
                is_active: newStatus
            });
        });
    });
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const userId = req.params.id;
    
    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        logAdminAction(req.user.id, req.user.email, 'DELETE_USER', {
            targetUserId: userId,
            ip: req.ip
        });
        
        res.json({ success: true, message: 'User deleted successfully' });
    });
});

app.get('/api/admin/logs', authenticateToken, requireAdmin, (req, res) => {
    const { limit = 50 } = req.query;
    
    db.all('SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT ?', [parseInt(limit)], (err, logs) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, logs: logs });
    });
});

app.get('/api/admin/activity', authenticateToken, requireAdmin, (req, res) => {
    db.all('SELECT * FROM recent_activity LIMIT 50', (err, activity) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, activity: activity });
    });
});

// ============= LOST ITEMS API ROUTES =============

app.get('/api/lost-items', (req, res) => {
    const { status, category, search } = req.query;
    let query = 'SELECT * FROM lost_items WHERE 1=1';
    const params = [];

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }

    if (search) {
        query += ' AND (item_name LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, data: rows });
    });
});

app.get('/api/lost-items/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM lost_items WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        res.json({ success: true, data: row });
    });
});

app.post('/api/lost-items', authenticateToken, (req, res) => {
    const {
        item_name, category, description, date_lost, location_lost,
        student_name, contact_number, email, student_id
    } = req.body;

    if (!item_name || !category || !description || !date_lost || !location_lost || 
        !student_name || !contact_number || !email || !student_id) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const query = `
        INSERT INTO lost_items 
        (user_id, item_name, category, description, date_lost, location_lost, 
         student_name, contact_number, email, student_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
        req.user.id, item_name, category, description, date_lost, location_lost,
        student_name, contact_number, email, student_id
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            success: true,
            message: 'Lost item reported successfully',
            id: this.lastID
        });
    });
});

app.put('/api/lost-items/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT user_id FROM lost_items WHERE id = ?', [id], (err, item) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        if (req.user.role !== 'admin' && item.user_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only edit your own items' });
        }
        
        const updates = [];
        const values = [];
        
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined && key !== 'user_id') {
                updates.push(`${key} = ?`);
                values.push(req.body[key]);
            }
        });
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        values.push(id);
        const query = `UPDATE lost_items SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        
        db.run(query, values, function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Item updated successfully' });
        });
    });
});

app.delete('/api/lost-items/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT user_id FROM lost_items WHERE id = ?', [id], (err, item) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        if (req.user.role !== 'admin' && item.user_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only delete your own items' });
        }
        
        db.run('DELETE FROM lost_items WHERE id = ?', [id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (req.user.role === 'admin') {
                logAdminAction(req.user.id, req.user.email, 'DELETE_LOST_ITEM', {
                    targetItemId: id,
                    ip: req.ip
                });
            }
            
            res.json({ success: true, message: 'Item deleted successfully' });
        });
    });
});

// ============= FOUND ITEMS API ROUTES =============

app.get('/api/found-items', (req, res) => {
    const { status, category, search } = req.query;
    let query = 'SELECT * FROM found_items WHERE 1=1';
    const params = [];

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }

    if (search) {
        query += ' AND (item_name LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, data: rows });
    });
});

app.get('/api/found-items/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM found_items WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        res.json({ success: true, data: row });
    });
});

app.post('/api/found-items', authenticateToken, (req, res) => {
    const {
        item_name, category, description, date_found, location_found,
        finder_name, contact_number, email, student_id, image_url
    } = req.body;

    if (!item_name || !category || !description || !date_found || 
        !location_found || !finder_name || !contact_number) {
        return res.status(400).json({ error: 'Required fields are missing' });
    }

    const query = `
        INSERT INTO found_items 
        (user_id, item_name, category, description, date_found, location_found, 
         finder_name, contact_number, email, student_id, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
        req.user.id, item_name, category, description, date_found, location_found,
        finder_name, contact_number, email, student_id, image_url
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            success: true,
            message: 'Found item reported successfully',
            id: this.lastID
        });
    });
});

app.get('/api/my-items', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    db.all('SELECT * FROM lost_items WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, lostItems) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        db.all('SELECT * FROM found_items WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, foundItems) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                success: true,
                lost_items: lostItems,
                found_items: foundItems
            });
        });
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`╔═══════════════════════════════════════════════╗`);
    console.log(`║  Lost & Found System - Server Started        ║`);
    console.log(`╠═══════════════════════════════════════════════╣`);
    console.log(`║  Environment: ${NODE_ENV.padEnd(32)} ║`);
    console.log(`║  Server: http://0.0.0.0:${PORT}${' '.repeat(22-PORT.toString().length)}║`);
    console.log(`║  Status: Authentication Enabled               ║`);
    console.log(`╚═══════════════════════════════════════════════╝`);
    
    if (NODE_ENV === 'development') {
        console.log(``);
        console.log(`📧 Admin Accounts:`);
        console.log(`   1. phareesh717@gmail.com (Password: Admin@123)`);
        console.log(`   2. Ravenbeastcr7@gmail.com (Password: Admin@123)`);
        console.log(``);
        console.log(`⚠️  IMPORTANT: Change admin passwords after first login!`);
    }
    console.log(``);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
