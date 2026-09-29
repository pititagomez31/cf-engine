-- Migration: 001_products.sql
-- Table: products

CREATE TABLE IF NOT EXISTS products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id text NOT NULL UNIQUE,
    source text NOT NULL DEFAULT '1688',
    source_url text NOT NULL,
    title text,
    description text,
    images jsonb DEFAULT '[]'::jsonb,
    supplier jsonb DEFAULT '{}'::jsonb,
    variants jsonb DEFAULT '[]'::jsonb,
    pricing jsonb DEFAULT '{}'::jsonb,
    inventory jsonb DEFAULT '{}'::jsonb,
    logistics jsonb DEFAULT '{}'::jsonb,
    raw_data jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_offer_id ON products(offer_id);
