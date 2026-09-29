-- Migration: 002_suppliers.sql
-- Table: suppliers

CREATE TABLE IF NOT EXISTS suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_external_id text UNIQUE,
    name text,
    location text,
    province text,
    raw_data jsonb,
    created_at timestamptz DEFAULT now()
);
