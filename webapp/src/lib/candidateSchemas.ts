import { z } from "zod";

export const candidateCreateSchema = z.object({
  resume_text: z.string().min(50).max(200000),
});

export type CandidateCreateInput = z.infer<typeof candidateCreateSchema>;

export const candidateUpdateSchema = z.object({
  resume_text: z.string().min(50).max(200000),
});

export type CandidateUpdateInput = z.infer<typeof candidateUpdateSchema>;

export type CandidateItem = {
  id: string;
  job_id: string; // FK
  status: string; // e.g., processing | completed | error
  resume_text: string;
  resume_summary?: any;
  pi_details?: any;
  skills_eval?: any;
  desired_exp_eval?: any;
  education_eval?: any;
  sparse_resume?: boolean | string;
  created_at: string;
  updated_at: string;
  // For GSI job_id lookup
  GSI1PK?: string; // job_id
  GSI1SK?: string; // id
};


