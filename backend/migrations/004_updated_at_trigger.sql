-- Migration: 004_updated_at_trigger.sql
-- Trigger function and triggers for updated_at column

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_products_updated_at'
    ) THEN
        CREATE TRIGGER trg_products_updated_at
        BEFORE UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_quotes_updated_at'
    ) THEN
        CREATE TRIGGER trg_quotes_updated_at
        BEFORE UPDATE ON quotes
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
