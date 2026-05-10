/*
  # Allow new users to insert their own profile on registration

  1. Security Changes
    - Add INSERT policy on `profiles` table allowing authenticated users
      to insert a row where the `id` column matches their own `auth.uid()`.
    - This is needed because when a user registers, they must create their
      own profile row. The existing "Admins can insert profiles" policy
      only allows Admins to insert, which blocks new users from creating
      their own profile during registration.
    - The WITH CHECK ensures the user can only insert a profile with their
      own auth ID, preventing impersonation.
*/

CREATE POLICY "New users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
