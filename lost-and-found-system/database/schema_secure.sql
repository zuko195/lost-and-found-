-- Lost and Found Database Schema with PRODUCTION-GRADE SECURITY
-- Version 3.0 - Enterprise Security Edition

-- ==================== EXISTING TABLES (From schema_with_auth.sql) ====================
-- Include all tables from schema_with_auth.sql first
-- Then add new security tables below

-- ==================== NEW SECURITY TABLES ====================

-- Account Lockouts (Track failed login attempts)
CREATE TABLE IF NOT EXISTS account_lockouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL,
    locked_until TIMESTAMP NOT NULL,
    reason VARCHAR(255) DEFAULT 'Failed login attempts',
    attempt_count INTEGER DEFAULT 0,
    unlocked_by INTEGER,
    unlocked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unlocked_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_lockouts_email ON account_lockouts(email);
CREATE INDEX IF NOT EXISTS idx_lockouts_until ON account_lockouts(locked_until);
CREATE INDEX IF NOT EXISTS idx_lockouts_active ON account_lockouts(email, locked_until);

-- Security Events (Audit log for security-related events)
CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type VARCHAR(50) NOT NULL,
    user_id INTEGER,
    email VARCHAR(255),
    ip_address VARCHAR(50),
    user_agent TEXT,
    details TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_email ON security_events(email);

-- Password History (Prevent password reuse)
CREATE TABLE IF NOT EXISTS password_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_date ON password_history(created_at);

-- CSRF Tokens (Cross-Site Request Forgery protection)
CREATE TABLE IF NOT EXISTS csrf_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_csrf_tokens_token ON csrf_tokens(token);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_user ON csrf_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires ON csrf_tokens(expires_at);

-- Rate Limit Tracking (Track API usage)
CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_unique ON rate_limits(identifier, endpoint, window_start);

-- ==================== SECURITY VIEWS ====================

-- Active Account Lockouts
CREATE VIEW IF NOT EXISTS active_lockouts AS
SELECT 
    al.*,
    u.full_name,
    u.email as user_email,
    (julianday(al.locked_until) - julianday('now')) * 24 * 60 as minutes_remaining
FROM account_lockouts al
LEFT JOIN users u ON al.email = u.email
WHERE al.locked_until > datetime('now')
  AND al.unlocked_at IS NULL
ORDER BY al.locked_until DESC;

-- Recent Security Events (Last 24 hours)
CREATE VIEW IF NOT EXISTS recent_security_events AS
SELECT 
    se.*,
    u.full_name,
    u.role
FROM security_events se
LEFT JOIN users u ON se.user_id = u.id
WHERE se.timestamp > datetime('now', '-24 hours')
ORDER BY se.timestamp DESC
LIMIT 100;

-- High Severity Security Events
CREATE VIEW IF NOT EXISTS critical_security_events AS
SELECT 
    se.*,
    u.full_name,
    u.email,
    u.role
FROM security_events se
LEFT JOIN users u ON se.user_id = u.id
WHERE se.severity IN ('high', 'critical')
ORDER BY se.timestamp DESC
LIMIT 50;

-- Failed Login Statistics
CREATE VIEW IF NOT EXISTS failed_login_stats AS
SELECT 
    email_or_student_id,
    COUNT(*) as total_attempts,
    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_attempts,
    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_attempts,
    MAX(attempted_at) as last_attempt,
    COUNT(DISTINCT ip_address) as unique_ips
FROM login_attempts
WHERE attempted_at > datetime('now', '-7 days')
GROUP BY email_or_student_id
HAVING failed_attempts > 3
ORDER BY failed_attempts DESC;

-- ==================== SECURITY TRIGGERS ====================

-- Auto-delete expired CSRF tokens
CREATE TRIGGER IF NOT EXISTS cleanup_expired_csrf_tokens
AFTER INSERT ON csrf_tokens
BEGIN
    DELETE FROM csrf_tokens WHERE expires_at < datetime('now');
END;

-- Auto-delete old security events (keep last 90 days)
CREATE TRIGGER IF NOT EXISTS cleanup_old_security_events
AFTER INSERT ON security_events
BEGIN
    DELETE FROM security_events WHERE timestamp < datetime('now', '-90 days');
END;

-- Log password changes to history
CREATE TRIGGER IF NOT EXISTS log_password_change
AFTER UPDATE OF password_hash ON users
FOR EACH ROW
WHEN NEW.password_hash != OLD.password_hash
BEGIN
    INSERT INTO password_history (user_id, password_hash)
    VALUES (NEW.id, NEW.password_hash);
    
    INSERT INTO security_events (event_type, user_id, email, severity, details)
    VALUES ('PASSWORD_CHANGED', NEW.id, NEW.email, 'medium', 'User changed password');
END;

-- Log admin role changes
CREATE TRIGGER IF NOT EXISTS log_role_change
AFTER UPDATE OF role ON users
FOR EACH ROW
WHEN NEW.role != OLD.role
BEGIN
    INSERT INTO security_events (
        event_type, 
        user_id, 
        email, 
        severity, 
        details
    )
    VALUES (
        CASE 
            WHEN NEW.role = 'admin' THEN 'PROMOTED_TO_ADMIN'
            ELSE 'DEMOTED_FROM_ADMIN'
        END,
        NEW.id,
        NEW.email,
        'high',
        'Role changed from ' || OLD.role || ' to ' || NEW.role
    );
END;

-- Log user deactivation
CREATE TRIGGER IF NOT EXISTS log_user_deactivation
AFTER UPDATE OF is_active ON users
FOR EACH ROW
WHEN NEW.is_active != OLD.is_active
BEGIN
    INSERT INTO security_events (
        event_type,
        user_id,
        email,
        severity,
        details
    )
    VALUES (
        CASE 
            WHEN NEW.is_active = 0 THEN 'USER_DEACTIVATED'
            ELSE 'USER_REACTIVATED'
        END,
        NEW.id,
        NEW.email,
        'medium',
        'Account ' || CASE WHEN NEW.is_active = 0 THEN 'deactivated' ELSE 'reactivated' END
    );
END;

-- ==================== SECURITY FUNCTIONS (Stored Procedures) ====================

-- Note: SQLite doesn't support stored procedures, but we can create helper queries

-- Check if email is locked (use in application)
-- SELECT * FROM account_lockouts 
-- WHERE email = ? AND locked_until > datetime('now') AND unlocked_at IS NULL;

-- Unlock account (use in application)
-- UPDATE account_lockouts 
-- SET unlocked_by = ?, unlocked_at = datetime('now')
-- WHERE email = ? AND locked_until > datetime('now');

-- Record security event (use in application)
-- INSERT INTO security_events (event_type, user_id, email, ip_address, severity, details)
-- VALUES (?, ?, ?, ?, ?, ?);

-- ==================== INITIAL SECURITY DATA ====================

-- Insert some predefined event types for reference
CREATE TABLE IF NOT EXISTS security_event_types (
    event_type VARCHAR(50) PRIMARY KEY,
    description TEXT,
    default_severity VARCHAR(20)
);

INSERT OR IGNORE INTO security_event_types VALUES
('LOGIN_SUCCESS', 'User logged in successfully', 'low'),
('LOGIN_FAILED', 'Failed login attempt', 'medium'),
('ACCOUNT_LOCKED', 'Account locked due to failed attempts', 'high'),
('ACCOUNT_UNLOCKED', 'Account manually unlocked', 'medium'),
('PASSWORD_CHANGED', 'User changed password', 'medium'),
('PASSWORD_RESET', 'Password reset requested', 'medium'),
('PROMOTED_TO_ADMIN', 'User promoted to admin role', 'high'),
('DEMOTED_FROM_ADMIN', 'User demoted from admin role', 'high'),
('USER_CREATED', 'New user account created', 'low'),
('USER_DELETED', 'User account deleted', 'high'),
('USER_DEACTIVATED', 'User account deactivated', 'medium'),
('USER_REACTIVATED', 'User account reactivated', 'medium'),
('RATE_LIMIT_EXCEEDED', 'API rate limit exceeded', 'medium'),
('XSS_ATTEMPT', 'Possible XSS attack detected', 'high'),
('SQL_INJECTION_ATTEMPT', 'Possible SQL injection detected', 'critical'),
('CSRF_TOKEN_INVALID', 'Invalid CSRF token submitted', 'high'),
('SESSION_HIJACKING_ATTEMPT', 'Possible session hijacking detected', 'critical'),
('BRUTE_FORCE_DETECTED', 'Brute force attack pattern detected', 'critical'),
('ITEM_CREATED', 'Lost or found item reported', 'low'),
('ITEM_DELETED', 'Item deleted', 'low'),
('ADMIN_ACTION', 'Admin performed action', 'medium');

-- ==================== SECURITY STATISTICS ====================

CREATE VIEW IF NOT EXISTS security_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_count,
    (SELECT COUNT(*) FROM active_lockouts) as locked_accounts,
    (SELECT COUNT(*) FROM security_events WHERE timestamp > datetime('now', '-24 hours')) as events_24h,
    (SELECT COUNT(*) FROM security_events WHERE severity = 'high' AND timestamp > datetime('now', '-24 hours')) as high_severity_24h,
    (SELECT COUNT(*) FROM security_events WHERE severity = 'critical' AND timestamp > datetime('now', '-7 days')) as critical_7days,
    (SELECT COUNT(*) FROM login_attempts WHERE attempted_at > datetime('now', '-24 hours')) as login_attempts_24h,
    (SELECT COUNT(*) FROM login_attempts WHERE success = 0 AND attempted_at > datetime('now', '-24 hours')) as failed_logins_24h;

-- ==================== CLEANUP JOBS ====================

-- These should be run periodically (e.g., daily cron job)

-- Delete old login attempts (keep last 30 days)
-- DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-30 days');

-- Delete old rate limit records (keep last 24 hours)
-- DELETE FROM rate_limits WHERE updated_at < datetime('now', '-24 hours');

-- Delete expired sessions
-- DELETE FROM sessions WHERE expires_at < datetime('now');

-- Delete expired CSRF tokens
-- DELETE FROM csrf_tokens WHERE expires_at < datetime('now');

-- Delete old security events (keep last 90 days)
-- DELETE FROM security_events WHERE timestamp < datetime('now', '-90 days');

-- Delete resolved lockouts (keep last 30 days)
-- DELETE FROM account_lockouts WHERE unlocked_at IS NOT NULL AND unlocked_at < datetime('now', '-30 days');

PRAGMA foreign_keys = ON;
