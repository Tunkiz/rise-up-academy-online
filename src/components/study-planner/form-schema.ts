import * as z from "zod";

export const formSchema = z.object({
  goal: z.string().min(10, { message: "Please describe your goal in at least 10 characters." }),
  timeframe: z.string().min(3, { message: "Please provide a timeframe (e.g., '3 months')." }),
  hours_per_week: z.coerce.number().min(1, { message: "Please enter at least 1 hour per week." }),
  subjects: z.array(z.string()).min(1, { message: "Please select at least one subject." }),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced"]),
  target_date: z.date().optional(),
});

export type FormValues = z.infer<typeof formSchema>;
