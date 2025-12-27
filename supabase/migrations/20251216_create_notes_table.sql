-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 4),
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'pdf' or 'docx'
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Policies

-- Admins can do everything
CREATE POLICY "Admins can manage notes" 
ON public.notes 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Students can view notes
CREATE POLICY "Students can view notes" 
ON public.notes 
FOR SELECT 
USING (true); -- Simplified: All authenticated users can view all notes (filtering happens in UI)
