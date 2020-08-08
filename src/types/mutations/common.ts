import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLFloat,
  GraphQLList,
  GraphQLUnionType,
} from "graphql";
import { documentUnionType } from "../object-types/document";

export const acceptedDocumentIngestionType = new GraphQLObjectType({
  name: "AcceptedDocumentIngestion",
  description: "A document which was accepted during ingestion",
  fields: {
    document: {
      type: GraphQLNonNull(documentUnionType),
      description: "The document which was accepted",
      resolve(root) {
        return root.document;
      },
    },
  },
});

export const ignoredDocumentIngestionType = new GraphQLObjectType({
  name: "IgnoredDocumentIngestion",
  description: "A document which was ignored during ingestion",
  fields: {
    document: {
      type: GraphQLNonNull(documentUnionType),
      description: "The document which was ignored",
      resolve(root) {
        return root.document;
      },
    },
  },
});

export const rejectedDocumentIngestionType = new GraphQLObjectType({
  name: "RejectedDocumentIngestion",
  description: "A document which was rejected during ingestion",
  fields: {
    rejectionReason: {
      type: GraphQLNonNull(GraphQLString),
      description: "The reason this document was rejection",
      resolve(root) {
        return root.failureReason;
      },
    },
    document: {
      type: GraphQLNonNull(documentUnionType),
      description: "The document which failed to be ingested",
      resolve(root) {
        return root.document;
      },
    },
  },
});

export const documentIngestionResultUnion = new GraphQLUnionType({
  name: "DocumentIngestionResult",
  description: "Describes the result of attempting to ingest this document",
  types: [
    acceptedDocumentIngestionType,
    ignoredDocumentIngestionType,
    rejectedDocumentIngestionType,
  ],
  resolveType(item) {
    return item.__type;
  },
});

export const documentIngestionReportType = new GraphQLObjectType({
  name: "DocumentIngestionReport",
  description:
    "A report of whether each document was ingested, ignored, or failed",
  fields: {
    documents: {
      type: GraphQLNonNull(
        GraphQLList(GraphQLNonNull(documentIngestionResultUnion))
      ),
      description: "The results of all documents",
    },
    ignoredCount: {
      type: GraphQLNonNull(GraphQLFloat),
      description: "The number of documents which were ignored",
    },
    rejectedCount: {
      type: GraphQLNonNull(GraphQLFloat),
      description: "The number of documents which were rejected",
    },
    acceptedCount: {
      type: GraphQLNonNull(GraphQLFloat),
      description: "The number of documents which were accepted",
    },
  },
});

export const notPermittedResult = new GraphQLObjectType({
  name: "NotPermittedResult",
  description: "Returned when an attempted operation was not permitted",
  fields: {
    reason: {
      type: GraphQLString,
      description:
        "The reason for not being given permission to perform the action.",
    },
  },
});

export const workspaceNotFoundErrorObject = new GraphQLObjectType({
  name: "WorkspaceNotFoundError",
  description:
    "A result indicating that the provided workspace is not yet synced on this GraphQL server",
  fields: {
    address: {
      type: GraphQLNonNull(GraphQLString),
    },
  },
});
