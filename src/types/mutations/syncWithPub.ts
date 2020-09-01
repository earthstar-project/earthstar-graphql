import { GraphQLNonNull, GraphQLString, GraphQLFieldConfig } from "graphql";
import { syncWithPubResultUnion } from "./common";
import { Context } from "../../types";

import { syncWorkspace } from "../../util";

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
  },
  async resolve(_root, args, ctx) {
    return syncWorkspace(args.workspace, args.pubUrl, ctx);
  },
};
