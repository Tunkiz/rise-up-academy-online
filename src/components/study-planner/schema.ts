import * as z from "zod";

export const subjects = [
  { label: "Mathematics", value: "mathematics" },
  { label: "Physics", value: "physics" },
  { label: "Chemistry", value: "chemistry" },
  { label: "Biology", value: "biology" },
  { label: "English", value: "english" },
  { label: "History", value: "history" },
  { label: "Geography", value: "geography" },
  { label: "Computer Science", value: "computer_science" },
  { label: "Business Studies", value: "business_studies" },
  { label: "Accounting", value: "accounting" },
] as const;

export const formSchema = z.object({
  goal: z.string().min(10, { message: "Please describe your goal in at least 10 characters." }),
  timeframe: z.string().min(3, { message: "Please provide a timeframe (e.g., '3 months')." }),
  hours_per_week: z.coerce.number().min(1, { message: "Please enter at least 1 hour per week." }),
  subjects: z.array(z.string()).min(1, { message: "Please select at least one subject." }),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced"]),
  target_date: z.date().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

export interface StudyPlan {
  id: string;
  user_id: string;
  tenant_id: string;
  goal: string;
  timeframe: string;
  hours_per_week: number;
  subjects: string[];
  plan_content: string;
  created_at: string;
  updated_at: string;
}

export interface StudyPlanTemplate {
  title: string;
  goal: string;
  timeframe: string;
  hours_per_week: number;
  subjects: string[];
  difficulty_level: "beginner" | "intermediate" | "advanced";
}
