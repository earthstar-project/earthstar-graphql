import { syncLocalAndHttp } from "earthstar";
import { initWorkspace } from "../util";
import { Context } from "../types";
import {
  GraphQLObjectType,
  GraphQLUnionType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInputObjectType,
  GraphQLScalarType,
} from "graphql";
import { workspaceType } from "./object-types/workspace";
import { documentUnionType, documentFormatEnum } from "./object-types/document";
import { GraphQLJSONObject } from "graphql-type-json";
import { WSAEACCES } from "constants";

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

export const syncResultUnion = new GraphQLUnionType({
  name: "SyncResult",
  description: "The result of an attempted sync operation.",
  types: [syncSuccessType, workspaceNotFoundErrorObject],
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
      type: syncResultUnion,
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
        const maybeStorage = ctx.workspaces.find(
          (wsStorage) => wsStorage.workspace === args.workspace
        );

        if (maybeStorage === undefined) {
          return {
            __type: workspaceNotFoundErrorObject,
            address: args.workspace,
          };
        }

        await syncLocalAndHttp(maybeStorage, args.pubUrl);

        return { __type: syncSuccessType, syncedWorkspace: maybeStorage };
      },
    },
    addWorkspace: {
      type: addWorkspaceResultUnion,
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
