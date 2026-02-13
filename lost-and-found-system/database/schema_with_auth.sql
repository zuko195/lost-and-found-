-- Lost and Found Database Schema with Authentication

-- ==================== AUTHENTICATION TABLES ====================

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    student_id VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'student', -- 'student', 'admin'
    login_method VARCHAR(20) DEFAULT 'email', -- 'student_id', 'email', 'google'
    google_id VARCHAR(255),
    profile_picture VARCHAR(500),
    is_verified BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for managing user sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Login attempts for security
CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_or_student_id VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    success BOOLEAN NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin action logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    admin_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_user_id INTEGER,
    target_item_id INTEGER,
    details TEXT,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==================== UPDATED ITEM TABLES ====================

-- Lost Items (updated with user_id)
CREATE TABLE IF NOT EXISTS lost_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    date_lost DATE NOT NULL,
    location_lost VARCHAR(255) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Found Items (updated with user_id)
CREATE TABLE IF NOT EXISTS found_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    date_found DATE NOT NULL,
    location_found VARCHAR(255) NOT NULL,
    finder_name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    student_id VARCHAR(50),
    status VARCHAR(50) DEFAULT 'unclaimed',
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Match Requests
CREATE TABLE IF NOT EXISTS match_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lost_item_id INTEGER,
    found_item_id INTEGER,
    claimer_name VARCHAR(255) NOT NULL,
    claimer_contact VARCHAR(20) NOT NULL,
    claimer_email VARCHAR(255),
    verification_status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE,
    FOREIGN KEY (found_item_id) REFERENCES found_items(id) ON DELETE CASCADE
);

-- ==================== INDEXES ====================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Item indexes
CREATE INDEX IF NOT EXISTS idx_lost_user_id ON lost_items(user_id);
CREATE INDEX IF NOT EXISTS idx_lost_status ON lost_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_category ON lost_items(category);
CREATE INDEX IF NOT EXISTS idx_lost_date ON lost_items(date_lost);

CREATE INDEX IF NOT EXISTS idx_found_user_id ON found_items(user_id);
CREATE INDEX IF NOT EXISTS idx_found_status ON found_items(status);
CREATE INDEX IF NOT EXISTS idx_found_category ON found_items(category);
CREATE INDEX IF NOT EXISTS idx_found_date ON found_items(date_found);

-- Admin log indexes
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON admin_logs(timestamp);

-- ==================== INITIAL ADMIN ACCOUNTS ====================

-- Create two admin accounts
-- Password for both: Admin@123 (hashed with bcrypt)
-- Hash: $2b$10$rKqW5xO.Uqm7xXZxN7.YAO7jY9qLQE5jK5p7wV8X7vY3sQ8fZ.YfG

INSERT OR IGNORE INTO users (
    email,
    student_id,
    password_hash,
    full_name,
    phone,
    role,
    login_method,
    is_verified,
    is_active
) VALUES 
(
    'phareesh717@gmail.com',
    'ADMIN001',
    '$2b$10$rKqW5xO.Uqm7xXZxN7.YAO7jY9qLQE5jK5p7wV8X7vY3sQ8fZ.YfG',
    'Admin One',
    '0000000000',
    'admin',
    'email',
    1,
    1
),
(
    'Ravenbeastcr7@gmail.com',
    'ADMIN002',
    '$2b$10$rKqW5xO.Uqm7xXZxN7.YAO7jY9qLQE5jK5p7wV8X7vY3sQ8fZ.YfG',
    'Admin Two',
    '0000000000',
    'admin',
    'email',
    1,
    1
);

-- ==================== VIEWS FOR REPORTING ====================

-- View for admin statistics
CREATE VIEW IF NOT EXISTS admin_statistics AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM lost_items WHERE status = 'active') as active_lost_items,
    (SELECT COUNT(*) FROM lost_items WHERE status = 'found') as found_items_count,
    (SELECT COUNT(*) FROM found_items WHERE status = 'unclaimed') as unclaimed_found_items,
    (SELECT COUNT(*) FROM match_requests WHERE verification_status = 'pending') as pending_matches;

-- View for recent activity
CREATE VIEW IF NOT EXISTS recent_activity AS
SELECT 
    'lost_item' as type,
    id as item_id,
    item_name as title,
    student_name as user_name,
    created_at as timestamp
FROM lost_items
UNION ALL
SELECT 
    'found_item' as type,
    id as item_id,
    item_name as title,
    finder_name as user_name,
    created_at as timestamp
FROM found_items
ORDER BY timestamp DESC
LIMIT 50;
