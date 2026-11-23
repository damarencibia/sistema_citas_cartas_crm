-- Brand refresh: nueva paleta Nexo (#FC4C13 / #1D1D1D / #808080 / #FFFFFF)
-- Actualiza los defaults de nuevos tenants y migra a quienes seguían con la paleta antigua.

ALTER TABLE tenants ALTER COLUMN primary_color SET DEFAULT '#FC4C13';
ALTER TABLE tenants ALTER COLUMN secondary_color SET DEFAULT '#808080';

-- Solo se actualizan tenants que aún tenían los valores por defecto antiguos;
-- los colores personalizados se respetan.
UPDATE tenants
SET primary_color = '#FC4C13'
WHERE primary_color IS NULL OR upper(primary_color) = '#1976D2';

UPDATE tenants
SET secondary_color = '#808080'
WHERE secondary_color IS NULL OR upper(secondary_color) = '#424242';
