# JD & Resume Processing Agents

This repository contains two Bedrock AgentCore-powered agents and a suite of Lambda-backed tools for Job Description (JD) parsing and Resume evaluation.

## Structure
- `agent/`
  - `jd_skill_processor_agent/` — Processes a JD by id. Fetches the JD from DynamoDB, invokes MCP tools in parallel, and persists `skills`, `education_desired_experience`, and `responsibilities` back to the same JD record.
  - `resume_processor_agent/` — Processes a candidate by id. Loads the candidate and related job, invokes resume tools in parallel, and persists `pi_details`, `sparse_resume`, `resume_summary`, `skills_eval`, `desired_exp_eval`, and `education_eval`.
- `tools/` — Lambda tool packages (MCP-registered) including:
  - JD: `jd_skills_extractor`, `jd_responsibility_extractor`, `jd_desired_experience_and_education`, validators
  - Resume: `resume_skills_scorer`, `resume_sparse_checker`, `resume_desired_experience_scorer`, `resume_education_evaluator`, `resume_summarizer`, `resume_pi_extractor`

See each agent folder `README.md` for detailed usage.

## Tools (MCP/Lambda)
JD tools
- jd_extract_jd_skills
  - Input: `{ jd: string }`
  - Output: JSON object of normalized skills/categories
- jd_responsibility_extractor
  - Input: `{ title: string, years_of_experience: string, seniority_level: string, job_page: string, must_have_skills?: string[] }`
  - Output: `{ responsibilities: { text: string, source_section: string }[] }`
- jd_desired_experience_and_education
  - Input: `{ title: string, jd?: string, must_have_skills?: string[] }`
  - Output: `{ desired_experience: { experience: string, source_section: string }[], education_preference: { education: string, source_section: string }[] }`
- jd_education_validator
  - Input: `{ education_preference: { education: string, source_section: string }[] }`
  - Output: `{ education_preference: { education: string, source_section: string }[] } (validated/rephrased)`
- jd_desired_experience_validator
  - Input: `{ desired_experience: { experience: string, source_section: string }[] }`
  - Output: `{ desired_experience: { experience: string, source_section: string }[] } (validated/rephrased)`

Resume tools
- resume_skills_scorer
  - Input: `{ resume_text: string, skills_with_context: { skill: string, jd_context: string }[] }`
  - Output: `{ skills: [{ skill, score, confidence, justification, resume_evidence, jd_context_used, notes }] }`
- resume_sparse_checker
  - Input: `{ resume_text: string }`
  - Output: `{ sparse_resume: boolean, reason: string }`
- resume_desired_experience_scorer
  - Input: `{ resume_text: string, desired_experience: string[] }`
  - Output: `{ experiences: [{ requirement, score, confidence, justification, resume_evidence, notes }] }`
- resume_education_evaluator
  - Input: `{ jd_education_and_certifications: string[], resume_text: string }`
  - Output: `{ education_certification_matching: [...], gaps: { missing_requirements: string[] } }`
- resume_summarizer
  - Input: `{ jd_text: string, resume_text: string, skills?: string[], desired_experience?: string[], education?: string[] }`
  - Output: `{ summary: string, match_score: number, strengths: string[], gaps: string[] }`
- resume_pi_extractor
  - Input: `{ resume_text: string }`
  - Output: `{ name: string|null, email: string|null, phone: string|null, years_of_experience: integer|"unknown" }`

## DynamoDB Tables
- `jobs` (JD records)
  - Keys: `id` (String)
  - Fields: `jd_text`/`text`, `title`, `years_of_experience`, `seniority_level`, `skills`, `education_desired_experience`, `responsibilities`, timestamps
- `candidates` (Resume records)
  - Keys: `id` (String)
  - Fields: `resume_text`, `job_id`, `pi_details`, `sparse_resume`, `resume_summary`, `skills_eval`, `desired_exp_eval`, `education_eval`, `status`, timestamps

## Environment
- AWS & tables
  - `AWS_REGION` (default `us-east-1`)
  - `JD_TABLE_NAME` (default `jobs`)
  - `CANDIDATE_TABLE_NAME` (default `candidates`)
- AgentCore MCP (Cognito OAuth2 client-credentials; tokens are fetched automatically)
  - `AGENTCORE_GATEWAY_URL`
  - `AGENTCORE_OAUTH_TOKEN_URL` (e.g., your Cognito domain `/oauth2/token`)
  - `AGENTCORE_OAUTH_CLIENT_ID`
  - `AGENTCORE_OAUTH_CLIENT_SECRET`
  - `AGENTCORE_OAUTH_SCOPE` (optional override)

## Run (see per-agent READMEs)
- JD agent: `agent/jd_skill_processor_agent/README.md`
- Resume agent: `agent/resume_processor_agent/README.md`

## Deploy (AgentCore StarterKit)
```bash
agentcore configure -e main.py -r us-east-1 --disable-memory
agentcore launch
```
Run the above inside the desired agent folder.

## Architecture
TBD — High-level diagram of agents, MCP Gateway, Lambda tools, and DynamoDB data flow.
