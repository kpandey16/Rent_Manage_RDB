-- Add optional Hindi name field to tenants table
ALTER TABLE tenants ADD COLUMN name_hi TEXT;

-- Add index for searching
CREATE INDEX IF NOT EXISTS idx_tenants_name_hi ON tenants(name_hi);

-- Example: Update existing tenants with Hindi names (optional)
-- UPDATE tenants SET name_hi = 'रमेश कुमार' WHERE name = 'Ramesh Kumar';
-- UPDATE tenants SET name_hi = 'सुरेश पटेल' WHERE name = 'Suresh Patel';
