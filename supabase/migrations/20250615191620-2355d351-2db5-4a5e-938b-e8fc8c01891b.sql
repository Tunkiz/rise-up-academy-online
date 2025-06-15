
-- Create a table for AI Tutor saved notes
CREATE TABLE public.tutor_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.tutor_notes IS 'Stores notes saved by users from the AI Tutor chat.';
COMMENT ON COLUMN public.tutor_notes.user_id IS 'The user who saved the note.';
COMMENT ON COLUMN public.tutor_notes.prompt IS 'The user''s prompt that generated the response.';
COMMENT ON COLUMN public.tutor_notes.response IS 'The AI''s response that was saved.';

-- Enable RLS
ALTER TABLE public.tutor_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notes"
ON public.tutor_notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
ON public.tutor_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON public.tutor_notes
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON public.tutor_notes
FOR UPDATE
USING (auth.uid() = user_id);
