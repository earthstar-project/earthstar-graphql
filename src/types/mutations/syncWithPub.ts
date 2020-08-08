import {
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLUnionType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLFieldConfig,
} from "graphql";
import {
  workspaceNotFoundErrorObject,
  documentIngestionReportType,
  rejectedDocumentIngestionType,
  acceptedDocumentIngestionType,
  ignoredDocumentIngestionType,
} from "./common";
import { workspaceType } from "../object-types/workspace";
import { Context } from "../../types";
import syncGraphql from "../../sync-graphql";
import { syncLocalAndHttp, isErr } from "earthstar";

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

export const syncWithPubField: GraphQLFieldConfig<{}, Context> = {
  type: GraphQLNonNull(syncWithPubResultUnion),
  description:
    "Sync one of the GraphQL server's locally stored workspaces with a pub's",
  args: {
    workspace: {
      type: GraphQLNonNull(GraphQLString),
      description: "The address of the workspace to sync, e.g. +camping.98765",
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
      const result = await syncGraphql(
        maybeStorage,
        args.pubUrl,
        ctx.syncFilters
      );

      if (isErr(result)) {
        return {
          __type: syncErrorType,
          reason: result.message,
        };
      }

      return {
        __type: detailedSyncSuccessType,
        syncedWorkspace: maybeStorage,
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
        pulled: result.pulled,
      };
    }
    const result = await syncLocalAndHttp(maybeStorage, args.pubUrl);

    if (isErr(result)) {
      return {
        __type: syncErrorType,
        reason: result.message,
      };
    }

    return {
      __type: syncSuccessType,
      syncedWorkspace: maybeStorage,
    };
  },
};
