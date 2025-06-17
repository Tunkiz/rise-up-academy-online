
-- Create exams table
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    registration_start_date DATE NOT NULL,
    registration_end_date DATE NOT NULL,
    exam_date DATE NOT NULL
);

-- Enable RLS for the new table
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to read exams
CREATE POLICY "Allow authenticated read access to exams"
ON public.exams
FOR SELECT
TO authenticated
USING (true);

-- Insert sample exam data
INSERT INTO public.exams (name, description, registration_start_date, registration_end_date, exam_date) VALUES
('National Senior Certificate (NSC)', 'The final matriculation exam for high school students in South Africa.', '2025-08-01', '2025-09-15', '2025-10-20'),
('Independent Examinations Board (IEB)', 'An alternative matriculation exam primarily for independent schools.', '2025-07-15', '2025-08-30', '2025-10-15'),
('General Education and Training Certificate (GETC)', 'A foundational certificate for adult learners.', '2025-09-01', '2025-10-01', '2025-11-10');
