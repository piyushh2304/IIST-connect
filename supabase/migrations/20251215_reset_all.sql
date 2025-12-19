-- ==========================================
-- 1. DROP EVERYTHING (Clean Slate)
-- ==========================================
-- WIPING AUTH USERS ensures "User already registered" doesn't happen.
-- WARNING: This deletes ALL registered users.
DELETE FROM auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.placements CASCADE;
DROP TABLE IF EXISTS public.event_ratings CASCADE;
DROP TABLE IF EXISTS public.event_attendance CASCADE;
DROP TABLE IF EXISTS public.club_memberships CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.event_templates CASCADE;
DROP TABLE IF EXISTS public.clubs CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ==========================================
-- 2. CREATE TABLES
-- ==========================================

-- PROFILES (Base user info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student')) DEFAULT 'student',
  college_id TEXT,
  semester INTEGER CHECK (semester >= 1 AND semester <= 8),
  branch TEXT,
  section TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- STUDENTS (Detailed student info for Admin Dashboard)
CREATE TABLE public.students (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    college_id TEXT,
    phone_number TEXT,
    date_of_birth DATE,
    semester INTEGER,
    year INTEGER,
    branch TEXT,
    section TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- ADMINS (Detailed admin info)
CREATE TABLE public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- CLUBS
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  details JSONB, -- For extra details like foundedBy, etc.
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- EVENTS
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  date_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  google_form_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- EVENT TEMPLATES
CREATE TABLE public.event_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  name TEXT NOT NULL, -- Internal name for the template
  description TEXT,
  location TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

-- CLUB MEMBERSHIPS
CREATE TABLE public.club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;

-- EVENT ATTENDANCE
CREATE TABLE public.event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attendance;

-- EVENT RATINGS
CREATE TABLE public.event_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.event_ratings ENABLE ROW LEVEL SECURITY;

-- PLACEMENTS
CREATE TABLE public.placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  company_name TEXT NOT NULL,
  google_form_url TEXT NOT NULL,
  eligibility_semesters INTEGER[] NOT NULL DEFAULT '{7,8}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT CHECK (target_role IN ('all', 'students', 'admins')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., 'event_reminder', 'announcement'
  related_id UUID, -- generic reference to event_id, etc.
  related_type TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. RLS POLICIES (Simplified for robustness)
-- ==========================================

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- STUDENTS
CREATE POLICY "Admins can view all students" ON public.students FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Students can view own record" ON public.students FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Students can update own record" ON public.students FOR UPDATE USING (auth.uid() = id);

-- ADMINS
CREATE POLICY "Admins can view all admins" ON public.admins FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins can update own record" ON public.admins FOR UPDATE USING (auth.uid() = id);

-- CLUBS
CREATE POLICY "Clubs are viewable by everyone" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Admins can manage clubs" ON public.clubs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- EVENTS
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admins can manage events" ON public.events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- EVENT TEMPLATES
CREATE POLICY "Admins can manage event templates" ON public.event_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- CLUB MEMBERSHIPS
CREATE POLICY "Memberships viewable by everyone" ON public.club_memberships FOR SELECT USING (true);
CREATE POLICY "Users can join clubs" ON public.club_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave clubs" ON public.club_memberships FOR DELETE USING (auth.uid() = user_id);

-- EVENT ATTENDANCE
CREATE POLICY "Attendance viewable by everyone" ON public.event_attendance FOR SELECT USING (true);
CREATE POLICY "Users can join events" ON public.event_attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update attendance" ON public.event_attendance FOR UPDATE USING (auth.uid() = user_id);

-- EVENT RATINGS
CREATE POLICY "Ratings viewable by everyone" ON public.event_ratings FOR SELECT USING (true);
CREATE POLICY "Users can rate events" ON public.event_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- PLACEMENTS
CREATE POLICY "Placements viewable by students" ON public.placements FOR SELECT USING (true); -- Simplified
CREATE POLICY "Admins can manage placements" ON public.placements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- ANNOUNCEMENTS
CREATE POLICY "Announcements viewable by everyone" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 4. TRIGGERS & SYNC LOGIC
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Insert into profiles
  INSERT INTO public.profiles (id, name, email, role, college_id, semester, branch, section)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'college_id',
    COALESCE((NEW.raw_user_meta_data->>'semester')::INTEGER, 1),
    NEW.raw_user_meta_data->>'branch',
    NEW.raw_user_meta_data->>'section'
  );

  -- 2. Insert into students (Only if role is student)
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'student' THEN
      INSERT INTO public.students (
          id,
          full_name,
          email,
          college_id,
          phone_number,
          date_of_birth,
          semester,
          year,
          branch,
          section
      )
      VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'name', ''),
          NEW.email,
          NEW.raw_user_meta_data->>'college_id',
          NEW.raw_user_meta_data->>'phone_number',
          (NEW.raw_user_meta_data->>'date_of_birth')::DATE,
          COALESCE((NEW.raw_user_meta_data->>'semester')::INTEGER, 1),
          COALESCE((NEW.raw_user_meta_data->>'year')::INTEGER, 1),
          NEW.raw_user_meta_data->>'branch',
          NEW.raw_user_meta_data->>'section'
      );
  
  -- 3. Insert into admins (Only if role is admin)
  ELSIF COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'admin' THEN
      INSERT INTO public.admins (
          id,
          full_name,
          email,
          phone_number
      )
      VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'name', ''),
          NEW.email,
          NEW.raw_user_meta_data->>'phone_number'
      );
  END IF;

  RETURN NEW;
END;
$$;

-- CREATE TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 5. BACKFILL EXISTING USERS
-- ==========================================
-- Re-run logic for existing auth users to populate profiles and students
DO $$
DECLARE
    user_rec RECORD;
BEGIN
    FOR user_rec IN SELECT * FROM auth.users LOOP
        -- Insert into profiles if not exists
        INSERT INTO public.profiles (id, name, email, role, college_id, semester, branch, section)
        VALUES (
            user_rec.id,
            COALESCE(user_rec.raw_user_meta_data->>'name', ''),
            user_rec.email,
            COALESCE(user_rec.raw_user_meta_data->>'role', 'student'),
            user_rec.raw_user_meta_data->>'college_id',
            COALESCE((user_rec.raw_user_meta_data->>'semester')::INTEGER, 1),
            user_rec.raw_user_meta_data->>'branch',
            user_rec.raw_user_meta_data->>'section'
        ) ON CONFLICT (id) DO NOTHING;

        -- Insert into students if student role
        IF COALESCE(user_rec.raw_user_meta_data->>'role', 'student') = 'student' THEN
            INSERT INTO public.students (
                id, full_name, email, college_id, phone_number, date_of_birth, semester, year, branch, section
            ) VALUES (
                user_rec.id,
                COALESCE(user_rec.raw_user_meta_data->>'name', ''),
                user_rec.email,
                user_rec.raw_user_meta_data->>'college_id',
                user_rec.raw_user_meta_data->>'phone_number',
                (user_rec.raw_user_meta_data->>'date_of_birth')::DATE,
                COALESCE((user_rec.raw_user_meta_data->>'semester')::INTEGER, 1),
                COALESCE((user_rec.raw_user_meta_data->>'year')::INTEGER, 1),
                user_rec.raw_user_meta_data->>'branch',
                user_rec.raw_user_meta_data->>'section'
            ) ON CONFLICT (id) DO NOTHING;
            
        -- Insert into admins if admin role
        ELSIF COALESCE(user_rec.raw_user_meta_data->>'role', 'student') = 'admin' THEN
            INSERT INTO public.admins (
                id, full_name, email, phone_number
            ) VALUES (
                user_rec.id,
                COALESCE(user_rec.raw_user_meta_data->>'name', ''),
                user_rec.email,
                user_rec.raw_user_meta_data->>'phone_number'
            ) ON CONFLICT (id) DO NOTHING;
        END IF;
    END LOOP;
END;
$$;
