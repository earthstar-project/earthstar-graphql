import {
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLUnionType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLFieldConfig,
} from "graphql";
import { workspaceNotFoundErrorObject } from "./common";
import { workspaceType } from "../object-types/workspace";
import { Context } from "../../types";
import syncGraphql from "../../sync-graphql";
import { syncLocalAndHttp } from "earthstar";

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

export const syncSuccessType = new GraphQLObjectType({
  name: "SyncSuccess",
  description: "The result of a successful sync operation.",
  fields: {
    syncedWorkspace: {
      type: workspaceType,
    },
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
      await syncGraphql(maybeStorage, args.pubUrl, ctx.syncFilters);
    } else {
      await syncLocalAndHttp(maybeStorage, args.pubUrl);
    }

    return { __type: syncSuccessType, syncedWorkspace: maybeStorage };
  },
};
