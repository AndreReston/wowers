/*
  # Reset demo user passwords

  1. Changes
    - Reset passwords for three demo users to match the credentials shown in the UI
    - admin@school.edu: admin123
    - juan@school.edu (Teacher): teach123
    - ana@school.edu (Student): stud123
    
  2. Notes
    - Uses Supabase's auth.users table password hashing
    - Passwords are hashed using pgcrypto's crypt function with 'bf' (bcrypt) algorithm
    - This allows the demo login buttons to work correctly
*/

UPDATE auth.users 
SET encrypted_password = crypt('admin123', gen_salt('bf'))
WHERE email = 'admin@school.edu';

UPDATE auth.users 
SET encrypted_password = crypt('teach123', gen_salt('bf'))
WHERE email = 'juan@school.edu';

UPDATE auth.users 
SET encrypted_password = crypt('stud123', gen_salt('bf'))
WHERE email = 'ana@school.edu';
