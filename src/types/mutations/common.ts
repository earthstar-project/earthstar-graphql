import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLFloat,
  GraphQLList,
  GraphQLUnionType,
} from "graphql";
import { documentUnionType } from "../object-types/document";
import { workspaceType } from "../object-types/workspace";
import documentIngestion from "../interfaces/documentIngestion";

export const acceptedDocumentIngestionType = new GraphQLObjectType({
  name: "AcceptedDocumentIngestion",
  description: "A document which was accepted during ingestion",
  interfaces: [documentIngestion],
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
  interfaces: [documentIngestion],
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
  interfaces: [documentIngestion],
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

export const detailedSyncSuccessType = new GraphQLObjectType({
  name: "DetailedSyncSuccess",
  description: "The result of a successful sync operation, with lots of detail",
  fields: {
    syncedWorkspace: {
      description: "The workspace which had documents synced from and to it",
      type: GraphQLNonNull(workspaceType),
    },
    pushed: {
      description:
        "A detailed report of the documents which were pushed to the pub. ",
      type: GraphQLNonNull(documentIngestionReportType),
    },
    pulled: {
      description:
        "A detailed report of the documents which were pulled from the pub",
      type: GraphQLNonNull(documentIngestionReportType),
    },
  },
});

export const syncSuccessType = new GraphQLObjectType({
  name: "SyncSuccess",
  description: "The result of a successful sync operation.",
  fields: {
    syncedWorkspace: {
      description: "The workspace which had documents synced from and to it",
      type: GraphQLNonNull(workspaceType),
    },
  },
});

export const syncErrorType = new GraphQLObjectType({
  name: "SyncError",
  description: "The result of a failed sync",
  fields: {
    reason: {
      type: GraphQLNonNull(GraphQLString),
      description: "The reason for the error",
      resolve(root) {
        return root.reason;
      },
    },
  },
});

export const syncWithPubResultUnion = new GraphQLUnionType({
  name: "SyncWithPubResult",
  description: "The result of an attempted sync operation with a pub",
  types: [
    syncSuccessType,
    workspaceNotFoundErrorObject,
    syncErrorType,
    detailedSyncSuccessType,
  ],
  resolveType(item) {
    return item.__type;
  },
});
