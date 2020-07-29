import schema from "./schema";
import { graphql, ExecutionResult } from "graphql";
import { Context } from "./types";

export default function query<DataType = { [key: string]: any }>(
  queryString: string,
  variables: Record<string, any>,
  ctx: Context
): Promise<ExecutionResult<DataType>> {
  return graphql(schema, queryString, undefined, ctx, variables) as Promise<
    ExecutionResult<DataType>
  >;
}
