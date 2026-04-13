-- =============================================================================
-- Bsharp Reco — Database Initialization Script
-- Run as MySQL root: mysql -u root -p < scripts/init_databases.sql
-- =============================================================================

-- Create Reco database (all Reco-specific data)
CREATE DATABASE IF NOT EXISTS reco_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create Converse database (local dev mirror of Converse auth tables)
CREATE DATABASE IF NOT EXISTS converse_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Reco user (full access to reco_db)
CREATE USER IF NOT EXISTS 'reco_user'@'localhost' IDENTIFIED BY 'reco_pass';
GRANT ALL PRIVILEGES ON reco_db.* TO 'reco_user'@'localhost';

-- Read-only Converse user (SELECT only on converse_db)
CREATE USER IF NOT EXISTS 'converse_readonly'@'localhost' IDENTIFIED BY 'converse_pass';
GRANT SELECT ON converse_db.* TO 'converse_readonly'@'localhost';

FLUSH PRIVILEGES;
