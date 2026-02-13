-- Create Initial Admin Accounts
-- Run this script ONCE during initial setup

-- Admin Account 1: phareesh717@gmail.com
-- Admin Account 2: Ravenbeastcr7@gmail.com
-- Default Password: Admin@123
-- 
-- ⚠️ IMPORTANT: Change these passwords immediately after first login!

-- Note: The password hash below is for: Admin@123
-- Generated using bcrypt with 10 rounds

INSERT OR IGNORE INTO users (
    email,
    student_id,
    password_hash,
    full_name,
    phone,
    role,
    login_method,
    is_verified,
    is_active,
    created_at
) VALUES 
(
    'phareesh717@gmail.com',
    'ADMIN001',
    '$2b$10$XqjKGJ5K.3vY7pN9xO.rLe8MZ5K7wV8X7vY3sQ8fZ.YfGkR5xO.Uq',
    'Phareesh - Administrator',
    '0000000000',
    'admin',
    'email',
    1,
    1,
    CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO users (
    email,
    student_id,
    password_hash,
    full_name,
    phone,
    role,
    login_method,
    is_verified,
    is_active,
    created_at
) VALUES 
(
    'Ravenbeastcr7@gmail.com',
    'ADMIN002',
    '$2b$10$XqjKGJ5K.3vY7pN9xO.rLe8MZ5K7wV8X7vY3sQ8fZ.YfGkR5xO.Uq',
    'Raven - Administrator',
    '0000000000',
    'admin',
    'email',
    1,
    1,
    CURRENT_TIMESTAMP
);

-- Verify the accounts were created
SELECT 
    id,
    email,
    student_id,
    full_name,
    role,
    is_active,
    created_at
FROM users 
WHERE role = 'admin';
