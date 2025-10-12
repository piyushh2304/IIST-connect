-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  phone_number text NOT NULL,
  year integer NOT NULL,
  semester integer NOT NULL,
  branch text NOT NULL,
  section text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view own data" ON public.students;
DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
DROP POLICY IF EXISTS "Admins can insert students" ON public.students;
DROP POLICY IF EXISTS "Admins can update students" ON public.students;

-- Students can view their own data
CREATE POLICY "Students can view own data"
ON public.students
FOR SELECT
USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Admins can view all students
CREATE POLICY "Admins can view all students"
ON public.students
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Admins can insert students
CREATE POLICY "Admins can insert students"
ON public.students
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Admins can update students
CREATE POLICY "Admins can update students"
ON public.students
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Generate and insert 1500 student records with unique emails
DO $$
DECLARE
  branches text[] := ARRAY['CSE', 'AIML', 'IOT', 'CIVIL', 'MECHANICAL'];
  sections text[] := ARRAY['A1', 'A2', 'A3'];
  semesters int[] := ARRAY[2, 4, 6, 8];
  years int[] := ARRAY[1, 2, 3, 4];
  year_map jsonb := '{"1": 25, "2": 24, "3": 23, "4": 22}'::jsonb;
  
  first_names text[] := ARRAY['Riya', 'Arjun', 'Priya', 'Rohan', 'Ananya', 'Aditya', 'Neha', 'Karan', 'Ishita', 'Vivek', 
    'Shreya', 'Rahul', 'Diya', 'Aman', 'Kavya', 'Siddharth', 'Pooja', 'Harsh', 'Tanvi', 'Ayush',
    'Sakshi', 'Yash', 'Meera', 'Varun', 'Nisha'];
  
  last_names text[] := ARRAY['Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Verma', 'Jain', 'Agarwal', 'Malhotra', 'Chopra',
    'Reddy', 'Iyer', 'Nair', 'Rao', 'Desai', 'Mehta', 'Shah', 'Kapoor', 'Bhatia', 'Khanna',
    'Sinha', 'Pandey', 'Mishra', 'Joshi', 'Saxena'];
  
  branch text;
  section text;
  year int;
  semester int;
  student_num int;
  first_name text;
  last_name text;
  student_email text;
  dob_year int;
  student_count int := 0;
  global_counter int := 1;
BEGIN
  FOREACH branch IN ARRAY branches LOOP
    FOREACH year IN ARRAY years LOOP
      FOREACH semester IN ARRAY semesters LOOP
        FOREACH section IN ARRAY sections LOOP
          FOR student_num IN 1..25 LOOP
            -- Pick random names
            first_name := first_names[1 + floor(random() * array_length(first_names, 1))::int];
            last_name := last_names[1 + floor(random() * array_length(last_names, 1))::int];
            
            -- Generate unique email with global counter
            student_email := lower(first_name) || '.' || lower(last_name) || '.' || 
              lower(branch) || (year_map->>year::text) || '.' || 
              lpad(global_counter::text, 4, '0') || '@indoreinstitute.com';
            
            -- Calculate DOB based on year
            CASE year
              WHEN 1 THEN dob_year := 2004 + floor(random() * 3)::int;
              WHEN 2 THEN dob_year := 2003 + floor(random() * 3)::int;
              WHEN 3 THEN dob_year := 2002 + floor(random() * 3)::int;
              ELSE dob_year := 2001 + floor(random() * 3)::int;
            END CASE;
            
            INSERT INTO public.students (
              email, 
              full_name, 
              date_of_birth, 
              phone_number, 
              year, 
              semester, 
              branch, 
              section
            ) VALUES (
              student_email,
              first_name || ' ' || last_name,
              make_date(dob_year, 1 + floor(random() * 12)::int, 1 + floor(random() * 28)::int),
              '+91' || (6000000000 + floor(random() * 4000000000))::bigint,
              year,
              semester,
              branch,
              section
            );
            
            student_count := student_count + 1;
            global_counter := global_counter + 1;
          END LOOP;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Inserted % student records', student_count;
END $$;