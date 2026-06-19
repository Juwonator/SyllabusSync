/*
  Migration: Add admin authentication infrastructure (roles, permissions, sessions, MFA, audit logs)
  Sprint A – Admin Panel Architecture V2
  
  This file should be executed with your migration runner (e.g., psql -f). It creates the required tables
  and alters the existing users table with default values so existing queries continue to work.
*/

-- 1. Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description)
    VALUES
        ('student', 'Default student role'),
        ('admin', 'Administrative user with configurable permissions'),
        ('super_admin', 'Full system access – all permissions granted')
    ON CONFLICT (name) DO NOTHING;

-- 2. Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Full permission set grouped by domain
INSERT INTO permissions (name, description) VALUES
    -- Users
    ('users.read',       'View user list and profiles'),
    ('users.update',     'Edit user profiles'),
    ('users.deactivate', 'Deactivate user accounts'),
    ('users.export',     'Export user data'),
    -- Questions
    ('questions.create',  'Create new questions'),
    ('questions.update',  'Edit existing questions'),
    ('questions.delete',  'Delete questions'),
    ('questions.publish', 'Publish / unpublish questions'),
    -- Subjects
    ('subjects.create', 'Create subjects'),
    ('subjects.update', 'Edit subjects'),
    ('subjects.delete', 'Delete subjects'),
    -- Topics
    ('topics.create', 'Create topics'),
    ('topics.update', 'Edit topics'),
    ('topics.delete', 'Delete topics'),
    -- Analytics
    ('analytics.read', 'View analytics dashboards'),
    -- Audit
    ('audit.read', 'View admin audit logs'),
    -- System
    ('system.settings', 'Manage system-wide settings')
ON CONFLICT (name) DO NOTHING;

-- 3. Role-Permissions join table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Grant admin role a curated set of permissions
INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE r.name = 'admin'
      AND p.name IN (
          'users.read', 'users.update',
          'questions.create', 'questions.update', 'questions.delete', 'questions.publish',
          'subjects.create', 'subjects.update', 'subjects.delete',
          'topics.create', 'topics.update', 'topics.delete',
          'analytics.read', 'audit.read'
      )
      AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
      );

-- Grant super_admin ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE r.name = 'super_admin'
      AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
      );

-- 4. Extend users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'student',
    ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE NULL,
    ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- 5. User sessions table (refresh token storage)
--    refresh_token_hash: we store a SHA-256 hash, never the plaintext token.
--    token_family: groups a chain of rotated tokens for replay detection.
--    rotated_from: links to the previous session in a rotation chain.
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(128) NOT NULL,
    token_family VARCHAR(64) NOT NULL,
    rotated_from INT REFERENCES user_sessions(id) ON DELETE SET NULL,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 6. Revoked JTIs table (access token revocation)
CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti VARCHAR(64) PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    revoked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 7. User MFA table (Encrypted TOTP secret storage)
CREATE TABLE IF NOT EXISTS user_mfa (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    encrypted_secret TEXT NOT NULL,
    secret_iv TEXT NOT NULL,
    secret_auth_tag TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Recovery codes table
CREATE TABLE IF NOT EXISTS recovery_codes (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(60) UNIQUE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8.5. MFA failed attempts table for account lockout
CREATE TABLE IF NOT EXISTS mfa_failed_attempts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 9. Admin audit logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type VARCHAR(50),
    target_id INT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_hash ON user_sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_family ON user_sessions (token_family);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user ON recovery_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_failed_attempts_user ON mfa_failed_attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_failed_attempts_expires ON mfa_failed_attempts (expires_at);
