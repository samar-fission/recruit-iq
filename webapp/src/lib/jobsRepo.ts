import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDbDocumentClient } from "./dynamodb";
import { tables } from "./env";
import type { JobItem } from "./jobSchemas";

export async function createJob(item: JobItem): Promise<void> {
  const ddb = getDynamoDbDocumentClient();
  await ddb.send(
    new PutCommand({ TableName: tables.jobs(), Item: item, ConditionExpression: "attribute_not_exists(id)" }),
  );
}

export async function updateJobDerived(
  id: string,
  fields: Pick<JobItem, "skills" | "education_desired_experience" | "responsibilities" | "updated_at">,
): Promise<void> {
  const ddb = getDynamoDbDocumentClient();
  await ddb.send(
    new UpdateCommand({
      TableName: tables.jobs(),
      Key: { id },
      UpdateExpression:
        "SET skills = :skills, education_desired_experience = :ede, responsibilities = :resp, updated_at = :ua",
      ExpressionAttributeValues: {
        ":skills": fields.skills ?? null,
        ":ede": fields.education_desired_experience ?? null,
        ":resp": fields.responsibilities ?? null,
        ":ua": fields.updated_at,
      },
    }),
  );
}

export async function overwriteJobEditable(
  id: string,
  fields: Pick<JobItem, "title" | "years_of_experience" | "seniority_level" | "jd_text"> &
    Pick<JobItem, "skills" | "education_desired_experience" | "responsibilities" | "updated_at">,
): Promise<void> {
  const ddb = getDynamoDbDocumentClient();
  await ddb.send(
    new UpdateCommand({
      TableName: tables.jobs(),
      Key: { id },
      UpdateExpression:
        "SET title = :t, years_of_experience = :yoe, seniority_level = :sl, jd_text = :jd, skills = :skills, education_desired_experience = :ede, responsibilities = :resp, updated_at = :ua",
      ExpressionAttributeValues: {
        ":t": fields.title,
        ":yoe": fields.years_of_experience,
        ":sl": fields.seniority_level,
        ":jd": fields.jd_text,
        ":skills": fields.skills ?? null,
        ":ede": fields.education_desired_experience ?? null,
        ":resp": fields.responsibilities ?? null,
        ":ua": fields.updated_at,
      },
    }),
  );
}

export async function getJob(id: string): Promise<JobItem | undefined> {
  const ddb = getDynamoDbDocumentClient();
  const res = await ddb.send(new GetCommand({ TableName: tables.jobs(), Key: { id } }));
  return res.Item as JobItem | undefined;
}

export async function listJobs(): Promise<JobItem[]> {
  const ddb = getDynamoDbDocumentClient();
  const res = await ddb.send(new ScanCommand({ TableName: tables.jobs() }));
  return (res.Items as JobItem[]) || [];
}

export async function deleteJob(id: string): Promise<void> {
  const ddb = getDynamoDbDocumentClient();
  await ddb.send(new DeleteCommand({ TableName: tables.jobs(), Key: { id } }));
}

export async function updateJobSkills(
  id: string,
  skills: JobItem["skills"],
  updated_at: string,
): Promise<void> {
  const ddb = getDynamoDbDocumentClient();
  await ddb.send(
    new UpdateCommand({
      TableName: tables.jobs(),
      Key: { id },
      UpdateExpression: "SET skills = :skills, updated_at = :ua",
      ExpressionAttributeValues: {
        ":skills": skills ?? null,
        ":ua": updated_at,
      },
    }),
  );
}


