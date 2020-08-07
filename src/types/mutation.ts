import { syncLocalAndHttp, Document } from "earthstar";
import { initWorkspace } from "../util";
import { Context } from "../types";
import {
  GraphQLObjectType,
  GraphQLUnionType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLList,
  graphql,
} from "graphql";
import { workspaceType } from "./object-types/workspace";
import { documentUnionType, documentFormatEnum } from "./object-types/document";
import syncGraphql from "../sync-graphql";

export const syncSuccessType = new GraphQLObjectType({
  name: "SyncSuccess",
  description: "The result of a successful sync operation.",
  fields: {
    syncedWorkspace: {
      type: workspaceType,
    },
  },
});

export const documentRejectedErrorObject = new GraphQLObjectType({
  name: "DocumentRejectedError",
  description:
    "A result indicating that the document was rejected from being set to the workspace, e.g. because it was signed improperly. The reason will always be unknown, until I can work out how to get richer data!",
  fields: {
    reason: {
      type: GraphQLNonNull(GraphQLString),
    },
  },
});

export const setDataSuccessResultObject = new GraphQLObjectType({
  name: "SetDataSuccessResult",
  description:
    "A result indicating the document was successfully set to the workspace",
  fields: {
    document: {
      type: GraphQLNonNull(documentUnionType),
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

export const setResultType = new GraphQLUnionType({
  name: "SetResult",
  description:
    "A possible result following an attempt to set data to a workspace's path",
  types: [
    setDataSuccessResultObject,
    documentRejectedErrorObject,
    workspaceNotFoundErrorObject,
  ],
  resolveType(item) {
    return item.__type;
  },
});

export const syncWithPubResultUnion = new GraphQLUnionType({
  name: "SyncWithPubResult",
  description: "The result of an attempted sync operation with a pub",
  types: [syncSuccessType, workspaceNotFoundErrorObject],
  resolveType(item) {
    return item.__type;
  },
});

export const ingestDocumentsSuccessType = new GraphQLObjectType({
  name: "IngestDocumentsSuccess",
  description: "The outcome of a successful document ingestion operation",
  fields: {
    workspace: {
      type: GraphQLNonNull(workspaceType),
      description: "The workspace which successfully ingested given documents",
    },
  },
});

export const ingestDocumentsResultUnion = new GraphQLUnionType({
  name: "IngestDocumentsResult",
  description: "The result of an attempt to ingest many documents",
  types: [workspaceNotFoundErrorObject, ingestDocumentsSuccessType],
  resolveType(item) {
    return item.__type;
  },
});

export const workspaceAddedResultType = new GraphQLObjectType({
  name: "WorkspaceAddedResult",
  description: "Describes a successful addition of a workspace",
  fields: {
    workspace: {
      type: GraphQLNonNull(workspaceType),
      description: "The newly added workspace",
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

export const workspaceExistsResult = new GraphQLObjectType({
  name: "WorkspaceExistsResult",
  description: "Describes a pre-existing workspace",
  fields: {
    workspace: {
      type: GraphQLNonNull(workspaceType),
      description: "The existing workspace",
    },
  },
});

export const addWorkspaceResultUnion = new GraphQLUnionType({
  name: "AddWorkspaceResult",
  description: "A possible result for adding a workspace",
  types: [workspaceAddedResultType, notPermittedResult, workspaceExistsResult],
  resolveType(item) {
    return item.__type;
  },
});

export const newDocumentInputType = new GraphQLInputObjectType({
  name: "NewDocumentInput",
  description: "An input for describing a new document",
  fields: {
    format: {
      type: documentFormatEnum,
      description: "The format for new document to follow",
    },
    content: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The content of the new document, e.g. "I love honey!',
    },
    path: {
      type: GraphQLNonNull(GraphQLString),
      description: "The path of the document, e.g. /spices/pepper",
    },
  },
});

export const authorInputType = new GraphQLInputObjectType({
  name: "AuthorInput",
  description: "An input for signing documents by a specific author",
  fields: {
    address: {
      type: GraphQLNonNull(GraphQLString),
      description:
        "The full address of the author, e.g. @suzy.6efJ8v8rtwoBxfN5MKeTF2Qqyf6zBmwmv8oAbendBZHP",
    },
    secret: {
      type: GraphQLNonNull(GraphQLString),
      description: "The author's secret key, used for signing",
    },
  },
});

export const documentInputType = new GraphQLInputObjectType({
  name: "DocumentInput",
  description: "An input for describing an existing document",
  fields: {
    format: {
      type: GraphQLNonNull(GraphQLString),
      description: "The format the existing document uses e.g. es.3",
    },
    workspace: {
      type: GraphQLNonNull(GraphQLString),
      description: "The address of the workspace this document belongs to",
    },
    content: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The content of the existing document, e.g. "I love honey!',
    },
    contentHash: {
      type: GraphQLNonNull(GraphQLString),
      description: "The hash of the document's content",
    },
    path: {
      type: GraphQLNonNull(GraphQLString),
      description: "The path of the existing document, e.g. /spices/pepper",
    },
    author: {
      type: GraphQLNonNull(GraphQLString),
      description: "The address of the existing's document author",
    },
    timestamp: {
      type: GraphQLNonNull(GraphQLFloat),
      description: "The timestamp of the existing document",
    },
    signature: {
      type: GraphQLNonNull(GraphQLString),
      description: "The signature of the existing document",
    },
    deleteAfter: {
      type: GraphQLFloat,
      description:
        "An optional timestamp indicating when this document should be deleted",
    },
  },
});

export const syncFormatEnum = new GraphQLEnumType({
  name: "SyncFormatEnum",
  values: {
    REST: {
      description: "The sync format for REST API Earthstar pubs",
    },
    GRAPHQL: {
      description: "The sync format for GraphQL Earthstar pubs",
    },
  },
});

export const mutationType = new GraphQLObjectType<{}, Context>({
  name: "Mutation",
  description: "The root mutation type",
  fields: () => ({
    set: {
      type: GraphQLNonNull(setResultType),
      description: "Set a value to a workspace's path",
      args: {
        author: {
          type: GraphQLNonNull(authorInputType),
        },
        document: {
          type: GraphQLNonNull(newDocumentInputType),
        },
        workspace: {
          type: GraphQLNonNull(GraphQLString),
          description:
            "The workspace address to set the data to, e.g. +cooking.123456",
        },
      },
      resolve(_root, args, ctx) {
        // first get the workspace to post to
        const ws = ctx.workspaces.find((ws) => {
          return ws.workspace === args.workspace;
        });

        if (ws === undefined) {
          return {
            __type: workspaceNotFoundErrorObject,
            address: args.workspace,
          };
        }

        const wasSuccessful = ws.set(args.author, {
          format: args.document.format || "es.4",
          content: args.document.content,
          path: args.document.path,
        });

        if (wasSuccessful) {
          return {
            __type: setDataSuccessResultObject,
            document: ctx.workspaces
              .find((ws) => ws.workspace === args.workspace)
              ?.getDocument(args.document.path),
          };
        }

        return {
          __type: documentRejectedErrorObject,
          reason: "Unknown!",
        };
      },
    },
    syncWithPub: {
      type: GraphQLNonNull(syncWithPubResultUnion),
      description:
        "Sync one of the GraphQL server's locally stored workspaces with a pub's",
      args: {
        workspace: {
          type: GraphQLNonNull(GraphQLString),
          description:
            "The address of the workspace to sync, e.g. +camping.98765",
        },
        pubUrl: {
          type: GraphQLNonNull(GraphQLString),
          description: "The URL of the pub to sync with",
        },
        format: {
          type: syncFormatEnum,
          defaultValue: "REST",
          description: "The format for this sync operation to take",
        },
      },
      async resolve(_root, args, ctx) {
        const maybeStorage = ctx.workspaces.find(
          (wsStorage) => wsStorage.workspace === args.workspace
        );

        if (maybeStorage === undefined) {
          return {
            __type: workspaceNotFoundErrorObject,
            address: args.workspace,
          };
        }

        if (args.format === "GRAPHQL") {
          await syncGraphql(maybeStorage, args.pubUrl, ctx.syncFilters);
        } else {
          await syncLocalAndHttp(maybeStorage, args.pubUrl);
        }

        return { __type: syncSuccessType, syncedWorkspace: maybeStorage };
      },
    },
    ingestDocuments: {
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

        args.documents.forEach((doc: Document) => {
          maybeStorage.ingestDocument(doc);
        });

        return { __type: ingestDocumentsSuccessType, workspace: maybeStorage };
      },
    },
    addWorkspace: {
      type: GraphQLNonNull(addWorkspaceResultUnion),
      description: "Attempt to add a new workspace to the current context",
      args: {
        workspaceAddress: {
          type: GraphQLNonNull(GraphQLString),
          description: "The address of the workspace to add",
        },
        author: {
          type: authorInputType,
          description:
            "The author wishing to add the workspace, possibly used to authorise this operation depending on the configuration",
        },
      },
      async resolve(_root, args, ctx) {
        const maybeExistingWorkspace = ctx.workspaces.find(
          (ws) => ws.workspace === args.workspaceAddress
        );

        if (maybeExistingWorkspace) {
          return {
            __type: workspaceExistsResult,
            workspace: maybeExistingWorkspace,
          };
        }

        if (ctx.canAddWorkspace(args.workspaceAddress, args.author) === false) {
          return {
            __type: notPermittedResult,
            reason: null,
          };
        }

        const newStorage = await initWorkspace(args.workspaceAddress, ctx);

        ctx.workspaces.push(newStorage);

        return {
          __type: workspaceAddedResultType,
          workspace: newStorage,
        };
      },
    },
  }),
});
