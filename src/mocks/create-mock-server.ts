import { generateAuthorKeypair, sign, Document, ValidatorEs3 } from "earthstar";
import { createSchemaContext, query } from "..";
import { graphql } from "msw";
import { PULL_QUERY, INGEST_MUTATION } from "../sync-graphql";
import { setupServer } from "msw/node";
import { GraphQLError } from "graphql";
import { Context } from "../types";

function createHandlers(context: Context) {
  return [
    graphql.query("PullQuery", async (req, res, ctx) => {
      const { data, errors } = await query(PULL_QUERY, req.variables, context);

      if (errors) {
        return res(ctx.errors(errors as Partial<GraphQLError>[]));
      }

      return res(ctx.data(data));
    }),
    graphql.mutation("IngestMutation", async (req, res, ctx) => {
      const { data, errors } = await query(
        INGEST_MUTATION,
        req.variables,
        context
      );

      if (errors) {
        return res(ctx.errors(errors as Partial<GraphQLError>[]));
      }

      return res(ctx.data(data));
    }),
  ];
}

export default function createMockServer(context: Context) {
  return setupServer(...createHandlers(context));
}