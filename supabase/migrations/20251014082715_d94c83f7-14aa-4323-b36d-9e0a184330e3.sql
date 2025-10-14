-- Create event_ratings table for student feedback
CREATE TABLE public.event_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on event_ratings
ALTER TABLE public.event_ratings ENABLE ROW LEVEL SECURITY;

-- Students can view all ratings
CREATE POLICY "Anyone can view event ratings"
ON public.event_ratings
FOR SELECT
USING (true);

-- Students can create their own ratings
CREATE POLICY "Students can create their own ratings"
ON public.event_ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Students can update their own ratings
CREATE POLICY "Students can update their own ratings"
ON public.event_ratings
FOR UPDATE
USING (auth.uid() = user_id);

-- Students can delete their own ratings
CREATE POLICY "Students can delete their own ratings"
ON public.event_ratings
FOR DELETE
USING (auth.uid() = user_id);

-- Create club_memberships table
CREATE TABLE public.club_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- Enable RLS on club_memberships
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;

-- Anyone can view memberships
CREATE POLICY "Anyone can view club memberships"
ON public.club_memberships
FOR SELECT
USING (true);

-- Students can join clubs
CREATE POLICY "Students can join clubs"
ON public.club_memberships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Students can leave clubs
CREATE POLICY "Students can leave clubs"
ON public.club_memberships
FOR DELETE
USING (auth.uid() = user_id);

-- Add preferences column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Create index for faster queries
CREATE INDEX idx_event_ratings_event_id ON public.event_ratings(event_id);
CREATE INDEX idx_event_ratings_user_id ON public.event_ratings(user_id);
CREATE INDEX idx_club_memberships_club_id ON public.club_memberships(club_id);
CREATE INDEX idx_club_memberships_user_id ON public.club_memberships(user_id);