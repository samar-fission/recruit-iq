import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDbDocumentClient } from "./dynamodb";
import { tables } from "./env";
import type { CandidateItem } from "./candidateSchemas";

export async function createCandidate(item: CandidateItem): Promise<void> {
  const ddb = getDynamoDbDocumentClient();
  await ddb.send(
    new PutCommand({
      TableName: tables.candidates(),
      Item: { ...item, GSI1PK: item.job_id, GSI1SK: item.id },
      ConditionExpression: "attribute_not_exists(id)",
    }),
  );
}

export async function getCandidate(id: string): Promise<CandidateItem | undefined> {
  const ddb = getDynamoDbDocumentClient();
  const res = await ddb.send(new GetCommand({ TableName: tables.candidates(), Key: { id } }));
  return res.Item as CandidateItem | undefined;
}

export async function listCandidatesByJob(job_id: string): Promise<CandidateItem[]> {
  const ddb = getDynamoDbDocumentClient();
  const res = await ddb.send(
    new QueryCommand({
      TableName: tables.candidates(),
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": job_id },
    }),
  );
  return (res.Items as CandidateItem[]) || [];
}

export async function updateCandidateEvaluations(
  id: string,
  fields: Partial<Pick<CandidateItem, "resume_summary" | "pi_details" | "skills_eval" | "desired_exp_eval" | "education_eval" | "sparse_resume" | "status" | "updated_at" | "resume_text">>,
): Promise<void> {
  const ddb = getDynamoDbDocumentClient();
  const names: Record<string, string> = {};
  const values: Record<string, any> = {};
  const sets: string[] = [];
  let i = 0;
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "undefined") continue; // avoid undefined values which break ExpressionAttributeValues
    i++;
    names[`#k${i}`] = k;
    values[`:v${i}`] = v;
    sets.push(`#k${i} = :v${i}`);
  }
  if (sets.length === 0) return; // nothing to update
  await ddb.send(
    new UpdateCommand({
      TableName: tables.candidates(),
      Key: { id },
      UpdateExpression: `SET ${sets.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}


