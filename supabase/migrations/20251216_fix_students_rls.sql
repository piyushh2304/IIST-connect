-- Allow students to insert their own record.
-- This is necessary for UPSERT operations when the record is missing.
-- The upsert with { id: profile.id } counts as an INSERT if the row is missing.
-- Previous policies only allowed SELECT and UPDATE.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'students' 
        AND policyname = 'Students can insert own record'
    ) THEN
        CREATE POLICY "Students can insert own record" 
        ON public.students 
        FOR INSERT 
        WITH CHECK (auth.uid() = id);
    END IF;
END
$$;
