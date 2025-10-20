import { z } from "zod";

export const seniorityEnum = z.enum([
  "intern",
  "junior",
  "mid",
  "senior",
  "lead",
  "principal",
]);

export const jobEditableSchema = z.object({
  title: z.string().min(2).max(120),
  years_of_experience: z.number().int().min(0).max(50),
  seniority_level: seniorityEnum,
  jd_text: z.string().min(20).max(10000),
});

export type JobEditable = z.infer<typeof jobEditableSchema>;

// Exact job item shape with required columns
export type JobItem = {
  id: string;
  title: string;
  years_of_experience: number;
  seniority_level: z.infer<typeof seniorityEnum>;
  jd_text: string;
  skills?: any; // agent-mapped object
  education_desired_experience?: any; // agent-mapped object
  responsibilities?: Array<{ text: string; source_section?: string }>; // list
  updated_at: string; // ISO
  created_at: string; // ISO
};


