
-- This script backfills the student_progress table based on existing lesson completions.
-- It calculates the progress for each user for each subject they have started.
INSERT INTO public.student_progress (user_id, subject_id, progress)
WITH user_subject_completions AS (
    -- Count completed lessons for each user in each subject
    SELECT
        lc.user_id,
        t.subject_id,
        COUNT(lc.id) AS completed_lessons
    FROM
        public.lesson_completions lc
    JOIN
        public.lessons l ON lc.lesson_id = l.id
    JOIN
        public.topics t ON l.topic_id = t.id
    GROUP BY
        lc.user_id,
        t.subject_id
),
subject_lesson_counts AS (
    -- Count total lessons in each subject
    SELECT
        t.subject_id,
        COUNT(l.id) AS total_lessons
    FROM
        public.lessons l
    JOIN
        public.topics t ON l.topic_id = t.id
    GROUP BY
        t.subject_id
)
-- Calculate progress and select for insertion
SELECT
    usc.user_id,
    usc.subject_id,
    CASE
        WHEN slc.total_lessons > 0 THEN
            (usc.completed_lessons::decimal / slc.total_lessons::decimal * 100)::int
        ELSE
            0
    END AS progress
FROM
    user_subject_completions usc
JOIN
    subject_lesson_counts slc ON usc.subject_id = slc.subject_id
-- On conflict, update the progress. This handles cases where a user's progress
-- might already have a (potentially outdated) row in the student_progress table.
ON CONFLICT (user_id, subject_id) DO UPDATE SET
    progress = EXCLUDED.progress;
