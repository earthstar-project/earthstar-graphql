import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLFieldConfig,
  GraphQLList,
  GraphQLUnionType,
  GraphQLInterfaceType,
} from "graphql";
import { isErr, syncLocalAndHttp, IStorage } from "earthstar";
import {
  workspaceNotFoundErrorObject,
  documentIngestionReportType,
  ignoredDocumentIngestionType,
  acceptedDocumentIngestionType,
  rejectedDocumentIngestionType,
} from "./common";
import { Context } from "../../types";
import { workspaceType } from "../object-types/workspace";
import syncGraphql, { isGraphQlPub } from "../../sync-graphql";
import { initWorkspace } from "../../util";

export const pubSyncDetailsInterface = new GraphQLInterfaceType({
  name: "PubSyncDetails",
  description: "Details about a pub sync",
  fields: {
    pubUrl: {
      type: GraphQLNonNull(GraphQLString),
      description: "The URL of the pub which was synced to",
    },
  },
});

export const detailedSyncSuccessType = new GraphQLObjectType({
  name: "DetailedSyncSuccess",
  interfaces: [pubSyncDetailsInterface],
  description: "The result of a successful sync operation, with lots of detail",
  fields: {
    pubUrl: {
      type: GraphQLNonNull(GraphQLString),
      description: "The URL of the pub which was synced to",
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
  interfaces: [pubSyncDetailsInterface],
  description: "The result of a successful sync operation.",
  fields: {
    pubUrl: {
      type: GraphQLNonNull(GraphQLString),
      description: "The URL of the pub which was synced to",
    },
  },
});

export const syncErrorType = new GraphQLObjectType({
  name: "SyncError",
  interfaces: [pubSyncDetailsInterface],
  description: "The result of a failed sync",
  fields: {
    pubUrl: {
      type: GraphQLNonNull(GraphQLString),
      description: "The URL of the pub which was synced to",
    },
    reason: {
      type: GraphQLNonNull(GraphQLString),
      description: "The reason for the error",
      resolve(root) {
        return root.reason;
      },
    },
  },
});

export const workspaceNotValidError = new GraphQLObjectType({
  name: "WorkspaceNotValidError",
  description: "An error given when an invalid workspace is specified",
  fields: {
    address: {
      type: GraphQLNonNull(GraphQLString),
      description: "The address of the invalid workspace",
    },
    reason: {
      type: GraphQLNonNull(GraphQLString),
      description: "The reason for the error",
      resolve(root) {
        return root.reason;
      },
    },
  },
});

export const pubSyncResultType = new GraphQLUnionType({
  name: "PubSyncResult",
  description: "A possible result of a sync operation with a pub",
  types: [detailedSyncSuccessType, syncSuccessType, syncErrorType],
  resolveType(item) {
    return item.__type;
  },
});

export const syncReportType = new GraphQLObjectType({
  name: "SyncReport",
  description: "A report of how a workspace was synced with many pubs",
  fields: {
    syncedWorkspace: {
      type: GraphQLNonNull(workspaceType),
      description: "The synced workspace",
    },
    pubSyncResults: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(pubSyncResultType))),
    },
  },
});

export const syncWithPubsResultUnion = new GraphQLUnionType({
  name: "SyncWithPubResult",
  description: "The result of an attempted sync operation with many pubs",
  types: [syncReportType, workspaceNotFoundErrorObject, workspaceNotValidError],
  resolveType(item) {
    return item.__type;
  },
});

async function syncWithPub(storage: IStorage, pubUrl: string, ctx: Context) {
  const shouldUseGraphqlSync = await isGraphQlPub(pubUrl);

  if (shouldUseGraphqlSync) {
    const result = await syncGraphql(storage, pubUrl, ctx.syncFilters);

    if (isErr(result)) {
      return {
        __type: syncErrorType,
        pubUrl,
        reason: result.message,
      };
    }

    return {
      __type: detailedSyncSuccessType,
      pubUrl,
      pushed: {
        ...result.pushed,
        documents: result.pushed.documents.map((doc) => ({
          ...doc,
          __type:
            doc.result === "REJECTED"
              ? rejectedDocumentIngestionType
              : doc.result === "ACCEPTED"
              ? acceptedDocumentIngestionType
              : ignoredDocumentIngestionType,
        })),
      },
      pulled: {
        ...result.pulled,
        documents: result.pulled.documents.map((doc) => ({
          ...doc,
          __type:
            doc.result === "REJECTED"
              ? rejectedDocumentIngestionType
              : doc.result === "ACCEPTED"
              ? acceptedDocumentIngestionType
              : ignoredDocumentIngestionType,
        })),
      },
    };
  }

  const result = await syncLocalAndHttp(storage, pubUrl);

  if (isErr(result)) {
    return {
      __type: syncErrorType,
      pubUrl,
      reason: result.message,
    };
  }

  return {
    __type: syncSuccessType,
    pubUrl,
    syncedWorkspace: storage,
  };
}

export const syncWithPubsField: GraphQLFieldConfig<{}, Context> = {
  type: GraphQLNonNull(syncWithPubsResultUnion),
  description:
    "Sync one of the GraphQL server's locally stored workspaces with many pubs'",
  args: {
    workspace: {
      type: GraphQLNonNull(GraphQLString),
      description: "The address of the workspace to sync, e.g. +camping.98765",
    },
    pubUrls: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString))),
      description: "The URL of the pub to sync with",
    },
  },
  async resolve(_root, { workspace, pubUrls }, ctx) {
    const maybeStorage = ctx.workspaces.find(
      (wsStorage) => wsStorage.workspace === workspace
    );

    if (maybeStorage === undefined && !ctx.canAddWorkspace(workspace)) {
      return {
        __type: workspaceNotFoundErrorObject,
        address: workspace,
      };
    }

    try {
      const storageToUse = maybeStorage
        ? maybeStorage
        : await initWorkspace(workspace, ctx);

      const results = await Promise.all(
        (pubUrls as string[]).map((url) => syncWithPub(storageToUse, url, ctx))
      );

      if (!maybeStorage) {
        ctx.workspaces.push(storageToUse);
      }

      return {
        __type: syncReportType,
        syncedWorkspace: storageToUse,
        pubSyncResults: results,
      };
    } catch (err) {
      if (isErr(err)) {
        return {
          __type: workspaceNotValidError,
          address: workspace,
          reason: err.message,
        };
      }

      throw err;
    }
  },
};
