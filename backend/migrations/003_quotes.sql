-- Migration: 003_quotes.sql
-- Table: quotes

CREATE TABLE IF NOT EXISTS quotes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    quantity integer NOT NULL DEFAULT 1,
    destination_country text NOT NULL,
    product_cost numeric,
    shipping_cost numeric,
    inspection_cost numeric,
    commission numeric,
    taxes numeric,
    total numeric,
    currency text DEFAULT 'CNY',
    status text DEFAULT 'draft',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
