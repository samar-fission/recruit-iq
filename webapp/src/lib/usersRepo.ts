import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDbDocumentClient } from "./dynamodb";
import { tables } from "./env";

export type UserItem = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  // For GSI lookups we need these attributes stored on the item
  GSI1PK?: string; // email
  GSI1SK?: string; // id
};

export async function getUserById(id: string): Promise<UserItem | undefined> {
  const ddb = getDynamoDbDocumentClient();
  const res = await ddb.send(
    new GetCommand({ TableName: tables.users(), Key: { id } }),
  );
  return res.Item as UserItem | undefined;
}

export async function getUserByEmail(email: string): Promise<UserItem | undefined> {
  const ddb = getDynamoDbDocumentClient();
  const res = await ddb.send(
    new QueryCommand({
      TableName: tables.users(),
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": email,
      },
      Limit: 1,
    }),
  );
  const item = res.Items?.[0] as UserItem | undefined;
  return item;
}

export async function createUser(user: UserItem): Promise<void> {
  const ddb = getDynamoDbDocumentClient();
  await ddb.send(
    new PutCommand({
      TableName: tables.users(),
      Item: {
        ...user,
        GSI1PK: user.email,
        GSI1SK: user.id,
      },
      ConditionExpression: "attribute_not_exists(id)",
    }),
  );
}

export async function updateUserPassword(id: string, password_hash: string): Promise<void> {
  const ddb = getDynamoDbDocumentClient();
  await ddb.send(
    new UpdateCommand({
      TableName: tables.users(),
      Key: { id },
      UpdateExpression: "SET password_hash = :ph",
      ExpressionAttributeValues: { ":ph": password_hash },
    }),
  );
}


