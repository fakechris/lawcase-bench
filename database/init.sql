-- Database initialization script for LawCase Bench
-- This script creates the initial database structure

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create database user for application
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lawcase_bench_user') THEN
        CREATE ROLE lawcase_bench_user LOGIN PASSWORD 'lawcase_bench_password';
    END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE lawcase_bench TO lawcase_bench_user;
GRANT ALL ON SCHEMA public TO lawcase_bench_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO lawcase_bench_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO lawcase_bench_user;
GRANT ALL ON SCHEMA public TO lawcase_bench_user;

-- Set default permissions for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO lawcase_bench_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO lawcase_bench_user;

-- Create initial tables (basic structure)
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    applied_steps_count INTEGER NOT NULL DEFAULT 0
);

-- Insert initial migration record
INSERT INTO schema_migrations (checksum, migration_name, started_at, applied_steps_count)
VALUES (
    'initial_setup',
    'initial_database_setup',
    NOW(),
    1
);