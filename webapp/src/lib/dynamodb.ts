import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getEnv } from "./env";

let cachedDdbDoc: DynamoDBDocumentClient | null = null;

export function getDynamoDbDocumentClient(): DynamoDBDocumentClient {
  if (cachedDdbDoc) return cachedDdbDoc;
  const env = getEnv();

  const client = new DynamoDBClient({
    region: env.AWS_REGION,
    // If running locally with credentials in env or shared config, SDK will resolve automatically
  });

  cachedDdbDoc = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });

  return cachedDdbDoc;
}


