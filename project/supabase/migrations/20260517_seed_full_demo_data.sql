-- ============================================================
-- SchoolOS — Complete Seed Data
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
--
-- ORDER MATTERS: schools → profiles → rooms → subjects →
--   enrollments → grades → attendance → books → book_transactions →
--   announcements → applicants → clearance → fees → payments →
--   document_requests → notices
-- ============================================================

-- ─── 0. HELPER: wipe existing seed data (safe re-run) ────────────────────────
DELETE FROM payments          WHERE TRUE;
DELETE FROM fees              WHERE TRUE;
DELETE FROM clearance         WHERE TRUE;
DELETE FROM document_requests WHERE TRUE;
DELETE FROM notices           WHERE TRUE;
DELETE FROM book_transactions WHERE TRUE;
DELETE FROM books             WHERE TRUE;
DELETE FROM attendance        WHERE TRUE;
DELETE FROM grades            WHERE TRUE;
DELETE FROM enrollments       WHERE TRUE;
DELETE FROM subjects          WHERE TRUE;
DELETE FROM announcements     WHERE TRUE;
DELETE FROM applicants        WHERE TRUE;
DELETE FROM rooms             WHERE TRUE;
-- NOTE: profiles linked to auth.users — only delete the demo rows
DELETE FROM profiles WHERE email IN (
  'admin@school.edu','juan@school.edu','maria@school.edu',
  'ana@school.edu','carlo@school.edu','lea@school.edu','ben@school.edu',
  'nina@school.edu','rex@school.edu',
  'marco@gmail.com','sofia@gmail.com','paolo@gmail.com',
  'jasmine@gmail.com','dante@gmail.com','katrina@gmail.com'
);
DELETE FROM schools WHERE name = 'Luntian College of Technology';

-- ─── 1. SCHOOLS ──────────────────────────────────────────────────────────────
INSERT INTO schools (id, name, slug, tagline, description, level, school_type,
                     address, city, province, region,
                     email, phone, website,
                     enrollment_open, hiring_open,
                     enrollment_note, hiring_note,
                     owner_id, is_published)
VALUES (
  '11111111-0000-0000-0000-000000000001',
  'Luntian College of Technology',
  'luntian-college-of-technology',
  'Nurturing Minds, Shaping Futures',
  'A premier private college offering quality education in technology, business, and the sciences in the heart of Quezon City.',
  'College',
  'Private',
  '123 Kalayaan Avenue, Diliman',
  'Quezon City',
  'Metro Manila',
  'NCR',
  'info@luntian.edu.ph',
  '(02) 8123-4567',
  'https://luntian.edu.ph',
  true,
  false,
  'Enrollment for AY 2026-2027 opens June 10, 2025. Online pre-registration is available.',
  '',
  NULL,
  true
);

-- ─── 2. AUTH USERS (create via Supabase Auth API or use existing UIDs) ────────
-- IMPORTANT: This seed assumes the demo emails already exist in auth.users.
-- If auth.users rows do not exist yet, create them first in the Supabase
-- Authentication dashboard or via the demo login buttons in the app.
--
-- Applicant demo emails used below:
--   marco@gmail.com, sofia@gmail.com, paolo@gmail.com,
--   jasmine@gmail.com, dante@gmail.com, katrina@gmail.com

-- ─── 3. PROFILES ─────────────────────────────────────────────────────────
-- Use the actual auth.users UUIDs for profile IDs.
INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Dr. Andrea Santos',
       email,
       'Admin', 'Active', 'AS',
       'BSIT', '1st Year', 'None',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'admin@school.edu';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Prof. Juan Reyes',
       email,
       'Teacher', 'Active', 'JR',
       'BSIT', '1st Year', 'None',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'juan@school.edu';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Prof. Maria Cruz',
       email,
       'Teacher', 'Active', 'MC',
       'BSCS', '1st Year', 'None',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'maria@school.edu';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Ana Dela Rosa',
       email,
       'Student', 'Active', 'AD',
       'BSIT', '2nd Year', 'BSIT-1A',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'ana@school.edu';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Carlo Bautista',
       email,
       'Student', 'Active', 'CB',
       'BSIT', '2nd Year', 'BSIT-1A',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'carlo@school.edu';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Lea Gomez',
       email,
       'Student', 'Active', 'LG',
       'BSCS', '2nd Year', 'BSCS-2A',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'lea@school.edu';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Ben Torres',
       email,
       'Student', 'Active', 'BT',
       'BSCS', '2nd Year', 'BSCS-2A',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'ben@school.edu';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Nina Villanueva',
       email,
       'Student', 'Active', 'NV',
       'BSIT', '3rd Year', 'BSIT-3A',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'nina@school.edu';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Rex Manalo',
       email,
       'Student', 'Active', 'RM',
       'BSIT', '3rd Year', 'BSIT-3A',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'rex@school.edu';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Marco Delos Reyes',
       email,
       'Applicant', 'Pending', 'MD',
       'BSIT', '1st Year', '',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'marco@gmail.com';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Sofia Mendoza',
       email,
       'Applicant', 'Pending', 'SM',
       'BSCS', '1st Year', '',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'sofia@gmail.com';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Paolo Ramos',
       email,
       'Applicant', 'Pending', 'PR',
       'BSBA', '1st Year', '',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'paolo@gmail.com';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Jasmine Ocampo',
       email,
       'Applicant', 'Pending', 'JO',
       'BSN', '1st Year', '',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'jasmine@gmail.com';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Dante Aquino',
       email,
       'Applicant', 'Pending', 'DA',
       'BSCRIM', '1st Year', '',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'dante@gmail.com';

INSERT INTO profiles (id, name, email, role, status, avatar, course, year, section, school_id)
SELECT id,
       'Katrina Lim',
       email,
       'Applicant', 'Pending', 'KL',
       'BSED', '1st Year', '',
       '11111111-0000-0000-0000-000000000001'
FROM auth.users
WHERE email = 'katrina@gmail.com';

-- Set owner_id after admin row exists in auth.users
UPDATE schools
SET owner_id = (
  SELECT id FROM auth.users WHERE email = 'admin@school.edu'
)
WHERE id = '11111111-0000-0000-0000-000000000001';

-- ─── 4. ROOMS ─────────────────────────────────────────────────────────────────
INSERT INTO rooms (id, name, category, floor, building, capacity, seats, status, section, school_id)
VALUES
('dddddddd-0000-0000-0000-000000000001','Room 101','Classroom','Ground Floor','Main Building',40,40,'Available','BSIT-1A','11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000002','Room 102','Classroom','Ground Floor','Main Building',40,40,'Available','BSIT-1B','11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000003','Room 201','Classroom','2nd Floor','Main Building',35,35,'Available','BSCS-2A','11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000004','Room 202','Classroom','2nd Floor','Main Building',35,35,'Available','BSCS-2B','11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000005','Room 301','Classroom','3rd Floor','Main Building',35,35,'Available','BSIT-3A','11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000006','CS Lab 1','Laboratory','2nd Floor','Main Building',30,30,'Available','BSCS-2A','11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000007','IT Lab 1','Laboratory','Ground Floor','Main Building',30,30,'Available','BSIT-1A','11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000008','Main Library','Library','3rd Floor','Main Building',60,60,'Available','None','11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000009','Faculty Room','Faculty Room','Ground Floor','Main Building',20,20,'Available','None','11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000010','Gymnasium','Gym','Ground Floor','Main Building',200,200,'Available','None','11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000011','Admin Office','Admin Office','Ground Floor','Main Building',10,10,'Available','None','11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000012','Canteen','Canteen','Ground Floor','Main Building',80,80,'Available','None','11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000013','Clinic','Clinic','Ground Floor','Main Building',5,5,'Available','None','11111111-0000-0000-0000-000000000001');

-- ─── 5. SUBJECTS ──────────────────────────────────────────────────────────────
INSERT INTO subjects (id, code, name, units, section, day, time_slot, room_id, teacher_id,
                      semester, academic_year, school_id)
VALUES
-- BSIT-1A — Juan Reyes
('eeeeeeee-0000-0000-0000-000000000001','IT101','Introduction to Computing',3,'BSIT-1A','Monday','7:00–8:00','dddddddd-0000-0000-0000-000000000007',(SELECT id FROM profiles WHERE email='juan@school.edu'),'2nd Semester','2025-2026','11111111-0000-0000-0000-000000000001'),
('eeeeeeee-0000-0000-0000-000000000002','IT102','Programming Fundamentals',3,'BSIT-1A','Wednesday','8:00–9:00','dddddddd-0000-0000-0000-000000000007',(SELECT id FROM profiles WHERE email='juan@school.edu'),'2nd Semester','2025-2026','11111111-0000-0000-0000-000000000001'),
('eeeeeeee-0000-0000-0000-000000000003','IT103','Computer Networks',3,'BSIT-1A','Friday','9:00–10:00','dddddddd-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='juan@school.edu'),'2nd Semester','2025-2026','11111111-0000-0000-0000-000000000001'),
-- BSIT-3A — Juan Reyes
('eeeeeeee-0000-0000-0000-000000000004','IT301','Web Development','3','BSIT-3A','Tuesday','10:00–11:00','dddddddd-0000-0000-0000-000000000005',(SELECT id FROM profiles WHERE email='juan@school.edu'),'2nd Semester','2025-2026','11111111-0000-0000-0000-000000000001'),
('eeeeeeee-0000-0000-0000-000000000005','IT302','Database Systems',3,'BSIT-3A','Thursday','13:00–14:00','dddddddd-0000-0000-0000-000000000005',(SELECT id FROM profiles WHERE email='juan@school.edu'),'2nd Semester','2025-2026','11111111-0000-0000-0000-000000000001'),
-- BSCS-2A — Maria Cruz
('eeeeeeee-0000-0000-0000-000000000006','CS201','Data Structures',3,'BSCS-2A','Monday','10:00–11:00','dddddddd-0000-0000-0000-000000000006',(SELECT id FROM profiles WHERE email='maria@school.edu'),'2nd Semester','2025-2026','11111111-0000-0000-0000-000000000001'),
('eeeeeeee-0000-0000-0000-000000000007','CS202','Algorithms',3,'BSCS-2A','Wednesday','13:00–14:00','dddddddd-0000-0000-0000-000000000006',(SELECT id FROM profiles WHERE email='maria@school.edu'),'2nd Semester','2025-2026','11111111-0000-0000-0000-000000000001'),
('eeeeeeee-0000-0000-0000-000000000008','CS203','Discrete Mathematics',3,'BSCS-2A','Friday','14:00–15:00','dddddddd-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='maria@school.edu'),'2nd Semester','2025-2026','11111111-0000-0000-0000-000000000001');

-- ─── 6. ENROLLMENTS ───────────────────────────────────────────────────────────
INSERT INTO enrollments (id, student_id, subject_id)
VALUES
('ffffffff-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='ana@school.edu'),'eeeeeeee-0000-0000-0000-000000000001'),
('ffffffff-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='ana@school.edu'),'eeeeeeee-0000-0000-0000-000000000002'),
('ffffffff-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='ana@school.edu'),'eeeeeeee-0000-0000-0000-000000000003'),
('ffffffff-0000-0000-0000-000000000004',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'eeeeeeee-0000-0000-0000-000000000001'),
('ffffffff-0000-0000-0000-000000000005',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'eeeeeeee-0000-0000-0000-000000000002'),
('ffffffff-0000-0000-0000-000000000006',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'eeeeeeee-0000-0000-0000-000000000003'),
('ffffffff-0000-0000-0000-000000000007',(SELECT id FROM profiles WHERE email='lea@school.edu'),'eeeeeeee-0000-0000-0000-000000000006'),
('ffffffff-0000-0000-0000-000000000008',(SELECT id FROM profiles WHERE email='lea@school.edu'),'eeeeeeee-0000-0000-0000-000000000007'),
('ffffffff-0000-0000-0000-000000000009',(SELECT id FROM profiles WHERE email='lea@school.edu'),'eeeeeeee-0000-0000-0000-000000000008'),
('ffffffff-0000-0000-0000-000000000010',(SELECT id FROM profiles WHERE email='ben@school.edu'),'eeeeeeee-0000-0000-0000-000000000006'),
('ffffffff-0000-0000-0000-000000000011',(SELECT id FROM profiles WHERE email='ben@school.edu'),'eeeeeeee-0000-0000-0000-000000000007'),
('ffffffff-0000-0000-0000-000000000012',(SELECT id FROM profiles WHERE email='ben@school.edu'),'eeeeeeee-0000-0000-0000-000000000008'),
('ffffffff-0000-0000-0000-000000000013',(SELECT id FROM profiles WHERE email='nina@school.edu'),'eeeeeeee-0000-0000-0000-000000000004'),
('ffffffff-0000-0000-0000-000000000014',(SELECT id FROM profiles WHERE email='nina@school.edu'),'eeeeeeee-0000-0000-0000-000000000005'),
('ffffffff-0000-0000-0000-000000000015',(SELECT id FROM profiles WHERE email='rex@school.edu'),'eeeeeeee-0000-0000-0000-000000000004'),
('ffffffff-0000-0000-0000-000000000016',(SELECT id FROM profiles WHERE email='rex@school.edu'),'eeeeeeee-0000-0000-0000-000000000005');

-- ─── 7. GRADES ────────────────────────────────────────────────────────────────
INSERT INTO grades (id, student_id, subject_id,
                    quizzes, activities, midterm, finals, remarks,
                    semester, academic_year)
VALUES
('f0000001-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='ana@school.edu'),'eeeeeeee-0000-0000-0000-000000000001',90,88,85,87,'Passed','2nd Semester','2025-2026'),
('f0000001-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='ana@school.edu'),'eeeeeeee-0000-0000-0000-000000000002',92,90,88,91,'Passed','2nd Semester','2025-2026'),
('f0000001-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='ana@school.edu'),'eeeeeeee-0000-0000-0000-000000000003',78,80,76,79,'Passed','2nd Semester','2025-2026'),
('f0000002-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'eeeeeeee-0000-0000-0000-000000000001',85,84,82,86,'Passed','2nd Semester','2025-2026'),
('f0000002-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'eeeeeeee-0000-0000-0000-000000000002',80,79,77,81,'Passed','2nd Semester','2025-2026'),
('f0000002-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'eeeeeeee-0000-0000-0000-000000000003',70,72,68,71,'Passed','2nd Semester','2025-2026'),
('f0000003-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='lea@school.edu'),'eeeeeeee-0000-0000-0000-000000000006',95,93,92,94,'Passed','2nd Semester','2025-2026'),
('f0000003-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='lea@school.edu'),'eeeeeeee-0000-0000-0000-000000000007',91,90,89,92,'Passed','2nd Semester','2025-2026'),
('f0000003-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='lea@school.edu'),'eeeeeeee-0000-0000-0000-000000000008',88,86,84,87,'Passed','2nd Semester','2025-2026'),
('f0000004-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='ben@school.edu'),'eeeeeeee-0000-0000-0000-000000000006',76,75,73,77,'Passed','2nd Semester','2025-2026'),
('f0000004-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='ben@school.edu'),'eeeeeeee-0000-0000-0000-000000000007',82,80,78,83,'Passed','2nd Semester','2025-2026'),
('f0000004-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='ben@school.edu'),'eeeeeeee-0000-0000-0000-000000000008',65,67,63,66,'Failed','2nd Semester','2025-2026'),
('f0000005-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='nina@school.edu'),'eeeeeeee-0000-0000-0000-000000000004',97,96,95,98,'Passed','2nd Semester','2025-2026'),
('f0000005-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='nina@school.edu'),'eeeeeeee-0000-0000-0000-000000000005',94,93,91,95,'Passed','2nd Semester','2025-2026'),
('f0000006-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='rex@school.edu'),'eeeeeeee-0000-0000-0000-000000000004',84,83,80,85,'Passed','2nd Semester','2025-2026'),
('f0000006-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='rex@school.edu'),'eeeeeeee-0000-0000-0000-000000000005',79,78,75,80,'Passed','2nd Semester','2025-2026');

-- ─── 8. ATTENDANCE ────────────────────────────────────────────────────────────
INSERT INTO attendance (id, subject_id, student_id, date, status, school_id)
VALUES
('a0000001-0000-0000-0000-000000000001','eeeeeeee-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='ana@school.edu'),'2025-05-11','Present','11111111-0000-0000-0000-000000000001'),
('a0000001-0000-0000-0000-000000000002','eeeeeeee-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'2025-05-11','Present','11111111-0000-0000-0000-000000000001'),
('a0000001-0000-0000-0000-000000000003','eeeeeeee-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='ana@school.edu'),'2025-05-18','Present','11111111-0000-0000-0000-000000000001'),
('a0000001-0000-0000-0000-000000000004','eeeeeeee-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'2025-05-18','Absent','11111111-0000-0000-0000-000000000001'),
('a0000001-0000-0000-0000-000000000005','eeeeeeee-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='ana@school.edu'),'2025-05-25','Late','11111111-0000-0000-0000-000000000001'),
('a0000001-0000-0000-0000-000000000006','eeeeeeee-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'2025-05-25','Present','11111111-0000-0000-0000-000000000001'),
('a0000002-0000-0000-0000-000000000001','eeeeeeee-0000-0000-0000-000000000006',(SELECT id FROM profiles WHERE email='lea@school.edu'),'2025-05-12','Present','11111111-0000-0000-0000-000000000001'),
('a0000002-0000-0000-0000-000000000002','eeeeeeee-0000-0000-0000-000000000006',(SELECT id FROM profiles WHERE email='ben@school.edu'),'2025-05-12','Present','11111111-0000-0000-0000-000000000001'),
('a0000002-0000-0000-0000-000000000003','eeeeeeee-0000-0000-0000-000000000006',(SELECT id FROM profiles WHERE email='lea@school.edu'),'2025-05-19','Present','11111111-0000-0000-0000-000000000001'),
('a0000002-0000-0000-0000-000000000004','eeeeeeee-0000-0000-0000-000000000006',(SELECT id FROM profiles WHERE email='ben@school.edu'),'2025-05-19','Excused','11111111-0000-0000-0000-000000000001'),
('a0000003-0000-0000-0000-000000000001','eeeeeeee-0000-0000-0000-000000000004',(SELECT id FROM profiles WHERE email='nina@school.edu'),'2025-05-13','Present','11111111-0000-0000-0000-000000000001'),
('a0000003-0000-0000-0000-000000000002','eeeeeeee-0000-0000-0000-000000000004',(SELECT id FROM profiles WHERE email='rex@school.edu'),'2025-05-13','Present','11111111-0000-0000-0000-000000000001');

-- ─── 9. BOOKS ─────────────────────────────────────────────────────────────────
INSERT INTO books (id, title, author, category, isbn, copies, available, school_id)
VALUES
('b0000001-0000-0000-0000-000000000001','Computer Organization and Architecture','William Stallings','ICT','978-0-13-468837-1',5,4,'11111111-0000-0000-0000-000000000001'),
('b0000001-0000-0000-0000-000000000002','Introduction to Algorithms','Cormen, Leiserson, Rivest','ICT','978-0-26-204630-5',4,3,'11111111-0000-0000-0000-000000000001'),
('b0000001-0000-0000-0000-000000000003','Database System Concepts','Silberschatz, Korth','ICT','978-0-07-802215-9',3,3,'11111111-0000-0000-0000-000000000001'),
('b0000001-0000-0000-0000-000000000004','Calculus: Early Transcendentals','James Stewart','Mathematics','978-1-28-574062-1',6,6,'11111111-0000-0000-0000-000000000001'),
('b0000001-0000-0000-0000-000000000005','Linear Algebra and Its Applications','David Lay','Mathematics','978-0-32-198238-4',4,4,'11111111-0000-0000-0000-000000000001'),
('b0000001-0000-0000-0000-000000000006','Biology: The Unity and Diversity of Life','Starr, Taggart','Science','978-1-30-506106-9',3,3,'11111111-0000-0000-0000-000000000001'),
('b0000001-0000-0000-0000-000000000007','Principles of Economics','N. Gregory Mankiw','Business','978-1-30-587394-2',4,3,'11111111-0000-0000-0000-000000000001'),
('b0000001-0000-0000-0000-000000000008','Rizal and the Development of National Consciousness','Gregorio Zaide','Humanities','978-971-23-1234-5',5,5,'11111111-0000-0000-0000-000000000001'),
('b0000001-0000-0000-0000-000000000009','Operating Systems: Three Easy Pieces','Arpaci-Dusseau','ICT','978-1-98-528450-6',3,2,'11111111-0000-0000-0000-000000000001'),
('b0000001-0000-0000-0000-000000000010','Clean Code','Robert C. Martin','ICT','978-0-13-235088-4',4,4,'11111111-0000-0000-0000-000000000001');

-- ─── 10. BOOK TRANSACTIONS ───────────────────────────────────────────────────
INSERT INTO book_transactions (id, book_id, borrower_id, borrow_date, due_date, returned_date, status)
VALUES
('b1000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='ana@school.edu'),'2025-05-05','2025-05-12',NULL,'Borrowed'),
('b1000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'2025-04-20','2025-04-27','2025-04-26','Returned'),
('b1000001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000010',(SELECT id FROM profiles WHERE email='nina@school.edu'),'2025-04-28','2025-05-05',NULL,'Overdue'),
('b1000001-0000-0000-0000-000000000004','b0000001-0000-0000-0000-000000000009',(SELECT id FROM profiles WHERE email='rex@school.edu'),'2025-05-08','2025-05-15',NULL,'Borrowed'),
('b1000001-0000-0000-0000-000000000005','b0000001-0000-0000-0000-000000000007',(SELECT id FROM profiles WHERE email='juan@school.edu'),'2025-05-01','2025-05-08','2025-05-07','Returned');

-- ─── 11. ANNOUNCEMENTS ───────────────────────────────────────────────────────
INSERT INTO announcements (id, title, content, target, author_id, school_id)
VALUES
('a1000001-0000-0000-0000-000000000001',
 'Final Exam Schedule Released',
 'The final examination schedule for 2nd Semester AY 2025-2026 is now available at the Registrar''s office and on the school portal. Please check your assigned room and time slot.',
 'All', (SELECT id FROM profiles WHERE email='admin@school.edu'), '11111111-0000-0000-0000-000000000001'),

('a1000001-0000-0000-0000-000000000002',
 'Library Hours Extended During Finals Week',
 'The Main Library will be open from 7:00 AM to 9:00 PM from May 19 to May 30 to support students during the final examination period.',
 'Students', (SELECT id FROM profiles WHERE email='admin@school.edu'), '11111111-0000-0000-0000-000000000001'),

('a1000001-0000-0000-0000-000000000003',
 'Faculty Grade Submission Deadline',
 'All faculty members are reminded to submit final grades no later than June 5, 2025. Late submissions will require a dean''s approval.',
 'Teachers', (SELECT id FROM profiles WHERE email='admin@school.edu'), '11111111-0000-0000-0000-000000000001'),

('a1000001-0000-0000-0000-000000000004',
 'Campus Clean-up Drive — May 24',
 'All students and staff are invited to join the annual campus clean-up drive on Saturday, May 24. Report to your respective departments by 8:00 AM.',
 'All', (SELECT id FROM profiles WHERE email='admin@school.edu'), '11111111-0000-0000-0000-000000000001'),

('a1000001-0000-0000-0000-000000000005',
 'Enrollment for AY 2026-2027 Opens June 10',
 'Online enrollment for the incoming academic year will open on June 10, 2025. Returning students must settle all outstanding fees before enrolling.',
 'Students', (SELECT id FROM profiles WHERE email='admin@school.edu'), '11111111-0000-0000-0000-000000000001');

-- ─── 12. APPLICANTS ──────────────────────────────────────────────────────────
INSERT INTO applicants (id, name, email, course, year, stage, notes, created_at, school_id, stage_timestamps, docs)
VALUES
(
  'a2000001-0000-0000-0000-000000000001',
  'Marco Delos Reyes', 'marco@gmail.com', 'BSIT', '1st Year',
  'Under Review', '', '2025-05-01', '11111111-0000-0000-0000-000000000001',
  '{"Applicant":"2025-05-01","Under Review":"2025-05-03"}',
  '{"Birth Certificate":true,"Form 138 (Report Card)":true,"Good Moral Certificate":false,"Medical Certificate":false,"2x2 ID Photo":true,"Barangay Clearance":false}'
),
(
  'a2000001-0000-0000-0000-000000000002',
  'Sofia Mendoza', 'sofia@gmail.com', 'BSCS', '1st Year',
  'For Interview', '', '2025-04-28', '11111111-0000-0000-0000-000000000001',
  '{"Applicant":"2025-04-28","Under Review":"2025-04-30","For Interview":"2025-05-05"}',
  '{"Birth Certificate":true,"Form 138 (Report Card)":true,"Good Moral Certificate":true,"Medical Certificate":true,"2x2 ID Photo":true,"Barangay Clearance":false}'
),
(
  'a2000001-0000-0000-0000-000000000003',
  'Paolo Ramos', 'paolo@gmail.com', 'BSBA', '1st Year',
  'Approved', '', '2025-04-15', '11111111-0000-0000-0000-000000000001',
  '{"Applicant":"2025-04-15","Under Review":"2025-04-17","For Interview":"2025-04-22","Approved":"2025-04-30"}',
  '{"Birth Certificate":true,"Form 138 (Report Card)":true,"Good Moral Certificate":true,"Medical Certificate":true,"2x2 ID Photo":true,"Barangay Clearance":true}'
),
(
  'a2000001-0000-0000-0000-000000000004',
  'Jasmine Ocampo', 'jasmine@gmail.com', 'BSN', '1st Year',
  'Enrolled', '', '2025-03-20', '11111111-0000-0000-0000-000000000001',
  '{"Applicant":"2025-03-20","Under Review":"2025-03-22","For Interview":"2025-03-28","Approved":"2025-04-02","Enrolled":"2025-04-10"}',
  '{"Birth Certificate":true,"Form 138 (Report Card)":true,"Good Moral Certificate":true,"Medical Certificate":true,"2x2 ID Photo":true,"Barangay Clearance":true}'
),
(
  'a2000001-0000-0000-0000-000000000005',
  'Dante Aquino', 'dante@gmail.com', 'BSCRIM', '1st Year',
  'Applicant', '', '2025-05-16', '11111111-0000-0000-0000-000000000001',
  '{"Applicant":"2025-05-16"}',
  '{"Birth Certificate":false,"Form 138 (Report Card)":false,"Good Moral Certificate":false,"Medical Certificate":false,"2x2 ID Photo":true,"Barangay Clearance":false}'
),
(
  'a2000001-0000-0000-0000-000000000006',
  'Katrina Lim', 'katrina@gmail.com', 'BSED', '1st Year',
  'Rejected', '', '2025-04-10', '11111111-0000-0000-0000-000000000001',
  '{"Applicant":"2025-04-10","Under Review":"2025-04-12","Rejected":"2025-04-18"}',
  '{"Birth Certificate":true,"Form 138 (Report Card)":false,"Good Moral Certificate":false,"Medical Certificate":false,"2x2 ID Photo":true,"Barangay Clearance":false}'
);

-- ─── 13. CLEARANCE ───────────────────────────────────────────────────────────
INSERT INTO clearance (id, student_id, school_id, office, cleared, cleared_by, notes, cleared_at)
VALUES
('c1000001-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='ana@school.edu'),'11111111-0000-0000-0000-000000000001','Library',true,(SELECT id FROM profiles WHERE email='admin@school.edu'),'No overdue books','2025-05-10 09:00:00+08'),
('c1000001-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='ana@school.edu'),'11111111-0000-0000-0000-000000000001','Accounting',false,(SELECT id FROM profiles WHERE email='admin@school.edu'),'',NULL),
('c1000001-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='ana@school.edu'),'11111111-0000-0000-0000-000000000001','Registrar',true,(SELECT id FROM profiles WHERE email='admin@school.edu'),'','2025-05-11 10:00:00+08'),
('c1000001-0000-0000-0000-000000000004',(SELECT id FROM profiles WHERE email='ana@school.edu'),'11111111-0000-0000-0000-000000000001','Laboratory',true,(SELECT id FROM profiles WHERE email='admin@school.edu'),'Equipment returned','2025-05-09 14:00:00+08'),
('c1000001-0000-0000-0000-000000000005',(SELECT id FROM profiles WHERE email='ana@school.edu'),'11111111-0000-0000-0000-000000000001','Student Affairs',false,(SELECT id FROM profiles WHERE email='admin@school.edu'),'',NULL),
('c1000002-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'11111111-0000-0000-0000-000000000001','Library',true,(SELECT id FROM profiles WHERE email='admin@school.edu'),'','2025-05-10 09:00:00+08'),
('c1000002-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'11111111-0000-0000-0000-000000000001','Accounting',false,(SELECT id FROM profiles WHERE email='admin@school.edu'),'Has outstanding balance',NULL),
('c1000002-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'11111111-0000-0000-0000-000000000001','Registrar',false,(SELECT id FROM profiles WHERE email='admin@school.edu'),'',NULL),
('c1000002-0000-0000-0000-000000000004',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'11111111-0000-0000-0000-000000000001','Laboratory',true,(SELECT id FROM profiles WHERE email='admin@school.edu'),'','2025-05-09 14:00:00+08'),
('c1000002-0000-0000-0000-000000000005',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'11111111-0000-0000-0000-000000000001','Student Affairs',true,(SELECT id FROM profiles WHERE email='admin@school.edu'),'','2025-05-11 11:00:00+08'),
('c1000003-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='nina@school.edu'),'11111111-0000-0000-0000-000000000001','Library',false,(SELECT id FROM profiles WHERE email='admin@school.edu'),'Has overdue book: Clean Code',NULL),
('c1000003-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='nina@school.edu'),'11111111-0000-0000-0000-000000000001','Accounting',false,(SELECT id FROM profiles WHERE email='admin@school.edu'),'',NULL),
('c1000003-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='nina@school.edu'),'11111111-0000-0000-0000-000000000001','Registrar',true,(SELECT id FROM profiles WHERE email='admin@school.edu'),'','2025-05-10 08:30:00+08'),
('c1000003-0000-0000-0000-000000000004',(SELECT id FROM profiles WHERE email='nina@school.edu'),'11111111-0000-0000-0000-000000000001','Laboratory',true,(SELECT id FROM profiles WHERE email='admin@school.edu'),'','2025-05-09 15:00:00+08'),
('c1000003-0000-0000-0000-000000000005',(SELECT id FROM profiles WHERE email='nina@school.edu'),'11111111-0000-0000-0000-000000000001','Student Affairs',true,(SELECT id FROM profiles WHERE email='admin@school.edu'),'','2025-05-11 09:00:00+08');

-- ─── 14. FEES ────────────────────────────────────────────────────────────────
INSERT INTO fees (id, student_id, school_id, fee_type, amount, paid, due_date, status, semester, academic_year)
VALUES
('fe000001-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='ana@school.edu'),'11111111-0000-0000-0000-000000000001','Tuition',18000,18000,'2025-02-28','Paid','2nd Semester','2025-2026'),
('fe000001-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='ana@school.edu'),'11111111-0000-0000-0000-000000000001','Misc Fee',1500,1500,'2025-02-28','Paid','2nd Semester','2025-2026'),
('fe000001-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='ana@school.edu'),'11111111-0000-0000-0000-000000000001','Library Fee',300,0,'2025-05-31','Unpaid','2nd Semester','2025-2026'),
('fe000002-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'11111111-0000-0000-0000-000000000001','Tuition',18000,9000,'2025-02-28','Partial','2nd Semester','2025-2026'),
('fe000002-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'11111111-0000-0000-0000-000000000001','Misc Fee',1500,0,'2025-02-28','Unpaid','2nd Semester','2025-2026'),
('fe000002-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'11111111-0000-0000-0000-000000000001','Lab Fee',800,800,'2025-02-28','Paid','2nd Semester','2025-2026'),
('fe000003-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='lea@school.edu'),'11111111-0000-0000-0000-000000000001','Tuition',18000,18000,'2025-02-28','Paid','2nd Semester','2025-2026'),
('fe000003-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='lea@school.edu'),'11111111-0000-0000-0000-000000000001','Misc Fee',1500,1500,'2025-02-28','Paid','2nd Semester','2025-2026'),
('fe000003-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='lea@school.edu'),'11111111-0000-0000-0000-000000000001','Lab Fee',800,400,'2025-05-31','Partial','2nd Semester','2025-2026'),
('fe000004-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='nina@school.edu'),'11111111-0000-0000-0000-000000000001','Tuition',18000,18000,'2025-02-28','Paid','2nd Semester','2025-2026'),
('fe000004-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='nina@school.edu'),'11111111-0000-0000-0000-000000000001','Registration',500,500,'2025-02-01','Paid','2nd Semester','2025-2026'),
('fe000004-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='nina@school.edu'),'11111111-0000-0000-0000-000000000001','PE Fee',400,0,'2025-05-31','Unpaid','2nd Semester','2025-2026');

-- ─── 15. PAYMENTS ────────────────────────────────────────────────────────────
INSERT INTO payments (id, student_id, amount, method, reference_no, notes, recorded_by, school_id, created_at)
VALUES
('a3000001-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='ana@school.edu'),18000,'GCash','GC-20250201-ANA','',(SELECT id FROM profiles WHERE email='admin@school.edu'),'11111111-0000-0000-0000-000000000001','2025-02-01 10:00:00+08'),
('a3000001-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='ana@school.edu'),1500,'Cash','', '',(SELECT id FROM profiles WHERE email='admin@school.edu'),'11111111-0000-0000-0000-000000000001','2025-02-05 09:30:00+08'),
('a3000002-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='carlo@school.edu'),9000,'Bank Transfer','BT-20250203-CAR','',(SELECT id FROM profiles WHERE email='admin@school.edu'),'11111111-0000-0000-0000-000000000001','2025-02-03 14:00:00+08'),
('a3000002-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='carlo@school.edu'),800,'Cash','', '',(SELECT id FROM profiles WHERE email='admin@school.edu'),'11111111-0000-0000-0000-000000000001','2025-02-05 10:00:00+08'),
('a3000003-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='lea@school.edu'),18000,'Maya','MY-20250201-LEA','',(SELECT id FROM profiles WHERE email='admin@school.edu'),'11111111-0000-0000-0000-000000000001','2025-02-01 11:00:00+08'),
('a3000003-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='lea@school.edu'),1500,'Cash','', '',(SELECT id FROM profiles WHERE email='admin@school.edu'),'11111111-0000-0000-0000-000000000001','2025-02-05 11:30:00+08'),
('a3000003-0000-0000-0000-000000000003',(SELECT id FROM profiles WHERE email='lea@school.edu'),400,'GCash','GC-20250310-LEA','',(SELECT id FROM profiles WHERE email='admin@school.edu'),'11111111-0000-0000-0000-000000000001','2025-03-10 09:00:00+08'),
('a3000004-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='nina@school.edu'),18000,'GCash','GC-20250201-NIN','',(SELECT id FROM profiles WHERE email='admin@school.edu'),'11111111-0000-0000-0000-000000000001','2025-02-01 08:30:00+08'),
('a3000004-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='nina@school.edu'),500,'Cash','', '',(SELECT id FROM profiles WHERE email='admin@school.edu'),'11111111-0000-0000-0000-000000000001','2025-01-20 09:00:00+08');

-- ─── 16. DOCUMENT REQUESTS ───────────────────────────────────────────────────
INSERT INTO document_requests (id, student_id, school_id, doc_type, purpose, copies, status, notes, requested_at, ready_at, released_at)
VALUES
('d1000001-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='ana@school.edu'),'11111111-0000-0000-0000-000000000001',
 'Certificate of Registration (COR)','Scholarship',1,'Released','','2025-05-01 09:00:00+08','2025-05-03 14:00:00+08','2025-05-04 10:00:00+08'),
('d1000001-0000-0000-0000-000000000002',(SELECT id FROM profiles WHERE email='ana@school.edu'),'11111111-0000-0000-0000-000000000001',
 'Certificate of Enrollment','Government Requirement',2,'Processing','Needed for PhilHealth update','2025-05-14 10:00:00+08',NULL,NULL),
('d1000002-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='carlo@school.edu'),'11111111-0000-0000-0000-000000000001',
 'Certificate of Good Moral','Employment',1,'Ready','','2025-05-10 08:00:00+08','2025-05-14 16:00:00+08',NULL),
('d1000003-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='nina@school.edu'),'11111111-0000-0000-0000-000000000001',
 'Transcript of Records (TOR)','Further Studies',1,'Pending','Official copy for grad school','2025-05-15 11:00:00+08',NULL,NULL),
('d1000004-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='lea@school.edu'),'11111111-0000-0000-0000-000000000001',
 'Student ID Request','Personal Use',1,'Released','Replacement ID','2025-04-20 09:00:00+08','2025-04-23 14:00:00+08','2025-04-24 10:00:00+08');

-- ─── 17. NOTICES (Notice Board) ───────────────────────────────────────────────────
INSERT INTO notices (id, school_id, author_id, title, body, category, target, pinned, expires_at, date)
VALUES
('a4000001-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='admin@school.edu'),
 'Scholarship Applications Now Open',
 'The Academic Excellence Scholarship for AY 2026-2027 is now accepting applications. Students with a GWA of 1.75 or better are encouraged to apply. Deadline: June 1, 2025.',
 'Academic', 'Students', true, NULL, '2025-05-12'),

('a4000001-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='admin@school.edu'),
 'Sports Fest Sign-Up Open',
 'The annual inter-course Sports Festival will be held on June 14-15, 2025 at the Gymnasium. Sign up at the Student Affairs office on or before May 28.',
 'Events', 'All', false, NULL, '2025-05-13'),

('a4000001-0000-0000-0000-000000000003','11111111-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='admin@school.edu'),
 'Reminder: Clearance Deadline',
 'All students must complete their departmental clearance before June 6, 2025 to be eligible for final examination results and TOR release.',
 'Reminders', 'Students', true, NULL, '2025-05-14'),

('a4000001-0000-0000-0000-000000000004','11111111-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='admin@school.edu'),
 'Guest Lecture: AI in Modern Software Development',
 'Join us on May 22, 2025, 2:00 PM at the Gymnasium. Industry professional Engr. Ramon Flores will discuss real-world AI applications for graduating IT and CS students.',
 'Events', 'All', false, NULL, '2025-05-15'),

('a4000001-0000-0000-0000-000000000005','11111111-0000-0000-0000-000000000001',(SELECT id FROM profiles WHERE email='admin@school.edu'),
 'Lost & Found: ID and Umbrella',
 'A student ID (no name visible) and a black umbrella were found near Room 201. Please claim at the Admin Office within 7 days.',
 'General', 'All', false, NULL, '2025-05-16');

-- ─── DONE ─────────────────────────────────────────────────────────────────
-- Summary of seeded records:
--   schools         : 1
--   profiles        : 9  (1 Admin, 2 Teachers, 6 Students)
--   rooms           : 13
--   subjects        : 8
--   enrollments     : 16
--   grades          : 16
--   attendance      : 12
--   books           : 10
--   book_transactions: 5
--   announcements   : 5
--   applicants      : 6  (all stages represented)
--   clearance       : 15
--   fees            : 12
--   payments        : 9
--   document_requests: 5
--   notices         : 5
-- ─────────────────────────────────────────────────────────────────────────────
