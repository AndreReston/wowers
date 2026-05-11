-- Seed a published school and rooms, then associate the admin user with that school.
-- Execute this in Supabase SQL editor or via migration tooling.

ALTER TABLE IF EXISTS rooms
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS grid_x integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grid_z integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grid_w integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS grid_d integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS seats integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS section text DEFAULT 'None';

INSERT INTO schools (
  name,
  slug,
  tagline,
  level,
  school_type,
  address,
  city,
  province,
  email,
  phone,
  website,
  is_published,
  enrollment_open,
  hiring_open,
  description
)
SELECT
  'Brightway Academy',
  'brightway-academy',
  'A modern campus for future leaders',
  'College',
  'Private',
  '101 Sunrise Blvd',
  'Metro City',
  'State',
  'info@brightway.edu',
  '+1 (555) 123-4567',
  'https://brightway.edu',
  true,
  true,
  true,
  'A welcoming school with classrooms, labs, and a guest-facing directory listing.'
WHERE NOT EXISTS (
  SELECT 1 FROM schools WHERE slug = 'brightway-academy'
);

WITH school AS (
  SELECT id FROM schools WHERE slug = 'brightway-academy'
)
INSERT INTO rooms (
  school_id,
  name,
  category,
  floor,
  building,
  capacity,
  status,
  notes,
  grid_x,
  grid_z,
  grid_w,
  grid_d
)
SELECT id, 'Room 101', 'Classroom', 'Ground Floor', 'Main Building', 50, 'Available', 'Large lecture hall with projector', 0, 0, 4, 4
FROM school
UNION ALL
SELECT id, 'IT Lab 1', 'Computer Lab', '1st Floor', 'Tech Wing', 28, 'Available', 'Computing lab with 30 workstations', 5, 0, 3, 3
FROM school
UNION ALL
SELECT id, 'Science Lab', 'Laboratory', '1st Floor', 'Science Wing', 24, 'Available', 'Equipped for chemistry and biology sessions', 10, 0, 3, 3
FROM school
UNION ALL
SELECT id, 'Library', 'Library', 'Ground Floor', 'Main Building', 80, 'Available', 'Quiet study space with research collections', 0, 5, 5, 4
FROM school
UNION ALL
SELECT id, 'Auditorium', 'Assembly', 'Ground Floor', 'Main Building', 150, 'Available', 'Large event space for presentations and ceremonies', 6, 6, 6, 5
FROM school;

UPDATE profiles
SET school_id = (
  SELECT id FROM schools WHERE slug = 'brightway-academy'
)
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@school.edu'
);
