-- Lost and Found Database Schema

-- Table for Lost Items
CREATE TABLE IF NOT EXISTS lost_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Found Items
CREATE TABLE IF NOT EXISTS found_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Match Requests (when someone claims a found item)
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
    FOREIGN KEY (lost_item_id) REFERENCES lost_items(id),
    FOREIGN KEY (found_item_id) REFERENCES found_items(id)
);

-- Table for Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lost_status ON lost_items(status);
CREATE INDEX IF NOT EXISTS idx_found_status ON found_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_category ON lost_items(category);
CREATE INDEX IF NOT EXISTS idx_found_category ON found_items(category);
CREATE INDEX IF NOT EXISTS idx_lost_date ON lost_items(date_lost);
CREATE INDEX IF NOT EXISTS idx_found_date ON found_items(date_found);
