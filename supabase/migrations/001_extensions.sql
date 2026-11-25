-- =============================================================================
-- Migration 001: Extensions
-- Project: Clinical Decision Support System (CDSS) - Radiology GPT
-- Description: Enables core PostgreSQL extensions required for UUID generation,
--              cryptographic security, and vector embeddings (pgvector).
-- =============================================================================

-- Enable UUID generation support (uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Enable pgcrypto for secure hashing, encryption, and password generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Enable pgvector for semantic search, document chunk embeddings, and clinical knowledge retrieval
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;

-- Grant usage on extensions schema to standard Supabase roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
