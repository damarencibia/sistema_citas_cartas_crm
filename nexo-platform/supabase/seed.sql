-- Seed data for development
INSERT INTO tenants (id, name, slug, email, phone, address, plan_id, status, modules)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Demo Beauty Salon', 'demo-beauty', 'demo@nexo.app', '+5491123456789', 'Av. Corrientes 1234, CABA', 'pro', 'active', '{"appointments": true, "digital_menu": false, "crm": true}'),
  ('22222222-2222-2222-2222-222222222222', 'Demo Restaurant', 'demo-restaurant', 'resto@nexo.app', '+5491198765432', 'Av. Santa Fe 5678, CABA', 'pro', 'active', '{"appointments": false, "digital_menu": true, "crm": true}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (tenant_id, name, description, duration_minutes, price, color)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Corte de Cabello', 'Corte de cabello para damas y caballeros', 30, 5000, '#1976D2'),
  ('11111111-1111-1111-1111-111111111111', 'Manicuria', 'Esmaltado semipermanente', 45, 3500, '#FF4081'),
  ('11111111-1111-1111-1111-111111111111', 'Pedicuria', 'Esmaltado semipermanente de pies', 45, 3500, '#FF4081'),
  ('11111111-1111-1111-1111-111111111111', 'Tinte', 'Tinte completo con productos profesionales', 90, 12000, '#9C27B0');
