import { syncLocalAndHttp } from "earthstar";
import { initWorkspace } from "../util";
import { Context } from "../types";
import {
  GraphQLObjectType,
  GraphQLUnionType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInputObjectType,
} from "graphql";
import { workspaceType } from "./object-types/workspace";
import { documentUnionType, documentFormatEnum } from "./object-types/document";
import { GraphQLJSONObject } from "graphql-type-json";

export const syncResultType = new GraphQLObjectType({
  name: "SyncResult",
  description:
    "The result of a sync operation. Currently not very descriptive, need to figure out how to get richer result data from this operation...",
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

export const documentInputType = new GraphQLInputObjectType({
  name: "DocumentInput",
  description: "An input for describing a new document",
  fields: {
    format: {
      type: documentFormatEnum,
      description: "The format for new document to follow",
    },
    value: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The value of the new document, e.g. "I love honey!',
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

export const mutationType = new GraphQLObjectType<{}, Context>({
  name: "Mutation",
  description: "The root mutation type",
  fields: () => ({
    set: {
      type: setResultType,
      description: "Set a value to a workspace's path",
      args: {
        author: {
          type: GraphQLNonNull(authorInputType),
        },
        document: {
          type: GraphQLNonNull(documentInputType),
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
          format: args.document.format || "es.3",
          value: args.document.value,
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
    sync: {
      type: syncResultType,
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
      },
      async resolve(_root, args, ctx) {
        // look for workspace, create if not already present

        const existingStorage = ctx.workspaces.find(
          (wsStorage) => wsStorage.workspace === args.workspace
        );

        const storage = existingStorage
          ? existingStorage
          : await initWorkspace(args.workspace, ctx.storageMode);

        await syncLocalAndHttp(storage, args.pubUrl);

        if (existingStorage === undefined) {
          ctx.workspaces.push(storage);
        }

        return { syncedWorkspace: storage };
      },
    },
  }),
});
