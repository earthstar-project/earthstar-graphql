import schema from "./schema";
import { graphql } from "graphql";
import { Context } from "./typeDefs";

export default function query(
  queryString: string,
  variables: Record<string, any>,
  ctx: Context
) {
  return graphql(schema, queryString, undefined, ctx, variables);
}
