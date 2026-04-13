-- =============================================================================
-- Bsharp Reco — Converse Seed Data Script
-- Run after init_databases.sql:
--   mysql -u root -p converse_db < scripts/seed_converse.sql
--
-- Creates the Converse auth tables and inserts seed data:
--   1 company (Test Brand), 2 users (1 admin, 1 staff)
-- =============================================================================

USE converse_db;

-- ---------------------------------------------------------------------------
-- celebrate_companies — Tenant/brand table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS celebrate_companies (
    cmid INT AUTO_INCREMENT PRIMARY KEY,
    cm_name VARCHAR(255) DEFAULT NULL,
    cm_domain TEXT DEFAULT NULL,
    cm_color VARCHAR(255) DEFAULT NULL,
    logo_image_url TEXT DEFAULT NULL,
    bsharp_token VARCHAR(255) DEFAULT NULL,
    allow_access INT UNSIGNED DEFAULT 1,
    emp_count INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- celebrate_users — User authentication table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS celebrate_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cmid INT DEFAULT 0,
    email_id TEXT DEFAULT NULL,
    mobile_no VARCHAR(225) DEFAULT NULL,
    first_name VARCHAR(225) DEFAULT NULL,
    last_name VARCHAR(225) DEFAULT NULL,
    password TEXT DEFAULT NULL,
    user_role INT DEFAULT 2,
    status INT DEFAULT 5,
    designation TEXT DEFAULT NULL,
    manager_email TEXT DEFAULT NULL,
    access_key VARCHAR(255) DEFAULT NULL,
    azure_id TEXT DEFAULT NULL,
    bsharp_uid INT DEFAULT NULL,
    whatsapp_opt INT DEFAULT 0,
    first_login INT DEFAULT 0,
    profile_file_name TEXT DEFAULT NULL,
    last_login DATETIME DEFAULT NULL,
    UNIQUE KEY unique_email (email_id(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- user_roles — Maps users to roles within companies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid INT NOT NULL,
    rid INT NOT NULL,
    cmid INT NOT NULL,
    status INT DEFAULT 0,
    INDEX idx_uid (uid),
    INDEX idx_cmid (cmid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Seed Data
-- ---------------------------------------------------------------------------

-- Insert test company (brand)
INSERT INTO celebrate_companies (cm_name, cm_domain, cm_color, logo_image_url, bsharp_token, allow_access, emp_count)
VALUES ('Test Brand', 'testbrand.com', '#1976D2', '/logos/testbrand-logo.png', 'test-token-123', 1, 50);

-- Get the cmid of the newly inserted company
SET @test_cmid = LAST_INSERT_ID();

-- Insert admin user
-- Password: 'admin123' hashed with Django's PBKDF2 (pbkdf2_sha256$600000$...)
-- For local dev, use Django shell to set password: user.set_password('admin123'); user.save()
INSERT INTO celebrate_users (cmid, email_id, first_name, last_name, password, user_role, status, designation)
VALUES (
    @test_cmid,
    'admin@testbrand.com',
    'Admin',
    'User',
    'pbkdf2_sha256$600000$salt$placeholder_hash_run_set_password_in_django_shell',
    1,
    5,
    'Brand Manager'
);

SET @admin_uid = LAST_INSERT_ID();

-- Insert staff user
INSERT INTO celebrate_users (cmid, email_id, first_name, last_name, password, user_role, status, designation)
VALUES (
    @test_cmid,
    'staff@testbrand.com',
    'Staff',
    'User',
    'pbkdf2_sha256$600000$salt$placeholder_hash_run_set_password_in_django_shell',
    2,
    5,
    'Store Associate'
);

SET @staff_uid = LAST_INSERT_ID();

-- Insert role mappings
INSERT INTO user_roles (uid, rid, cmid, status) VALUES (@admin_uid, 1, @test_cmid, 0);
INSERT INTO user_roles (uid, rid, cmid, status) VALUES (@staff_uid, 2, @test_cmid, 0);

-- ---------------------------------------------------------------------------
-- Grant converse_readonly user SELECT access (if not already done)
-- ---------------------------------------------------------------------------
-- Note: Run as root user if needed:
-- GRANT SELECT ON converse_db.* TO 'converse_readonly'@'localhost';
-- FLUSH PRIVILEGES;

-- ---------------------------------------------------------------------------
-- Verification queries
-- ---------------------------------------------------------------------------
SELECT 'Companies:' AS '';
SELECT cmid, cm_name, cm_domain FROM celebrate_companies;

SELECT 'Users:' AS '';
SELECT id, email_id, first_name, last_name, user_role, status FROM celebrate_users;

SELECT 'Roles:' AS '';
SELECT uid, rid, cmid, status FROM user_roles;
