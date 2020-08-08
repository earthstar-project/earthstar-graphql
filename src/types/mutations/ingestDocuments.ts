import {
  GraphQLNonNull,
  GraphQLList,
  GraphQLString,
  GraphQLFieldConfig,
  GraphQLUnionType,
  GraphQLObjectType,
} from "graphql";
import { Context } from "../../types";
import {
  workspaceNotFoundErrorObject,
  documentIngestionReportType,
  rejectedDocumentIngestionType,
  acceptedDocumentIngestionType,
  ignoredDocumentIngestionType,
} from "./common";
import documentInputType from "../inputs/documentInput";
import { ingestDocuments } from "../../util";

export const ingestDocumentsResultUnion = new GraphQLUnionType({
  name: "IngestDocumentsResult",
  description: "The result of an attempt to ingest many documents",
  types: [workspaceNotFoundErrorObject, documentIngestionReportType],
  resolveType(item) {
    return item.__type;
  },
});

export const ingestDocumentsField: GraphQLFieldConfig<{}, Context> = {
  type: GraphQLNonNull(ingestDocumentsResultUnion),
  description: "Sync documents to this GraphQL server from a peer",
  args: {
    workspace: {
      type: GraphQLNonNull(GraphQLString),
      description:
        "The address of the workspace to push documents to, e.g. +camping.98765",
    },
    documents: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(documentInputType))),
      description: "The documents to push up to the GraphQL server",
    },
  },
  resolve(_root, args, ctx) {
    const maybeStorage = ctx.workspaces.find(
      (wsStorage) => wsStorage.workspace === args.workspace
    );

    if (maybeStorage === undefined) {
      return {
        __type: workspaceNotFoundErrorObject,
        address: args.workspace,
      };
    }

    const reports = ingestDocuments(maybeStorage, args.documents).map(
      (report) => ({
        ...report,
        __type:
          report.result === "REJECTED"
            ? rejectedDocumentIngestionType
            : report.result === "ACCEPTED"
            ? acceptedDocumentIngestionType
            : ignoredDocumentIngestionType,
      })
    );

    return {
      __type: documentIngestionReportType,
      documents: reports,
      acceptedCount: reports.filter((res) => res.result === "ACCEPTED").length,
      ignoredCount: reports.filter((res) => res.result === "IGNORED").length,
      rejectedCount: reports.filter((res) => res.result === "REJECTED").length,
    };
  },
};
