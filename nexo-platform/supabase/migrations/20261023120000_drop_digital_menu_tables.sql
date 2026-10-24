-- Remove the Digital Menu (Carta Digital) module.
-- The platform is now focused exclusively on the Appointments & Bookings system.

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS extras CASCADE;
DROP TABLE IF EXISTS extra_groups CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS menus CASCADE;

-- Update the default modules config (no more digital_menu)
ALTER TABLE tenants
  ALTER COLUMN modules SET DEFAULT '{"appointments": true, "crm": false, "events": false}'::jsonb;

-- Remove the digital_menu key from existing tenants
UPDATE tenants SET modules = modules - 'digital_menu';
