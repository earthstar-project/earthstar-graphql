import { GraphQLList, GraphQLFieldConfig, GraphQLNonNull } from "graphql";
import { Context } from "../../types";
import { syncWithPubResultUnion } from "./common";
import SyncInput from "../inputs/SyncInput";

import { syncWorkspace } from "../../util";

export const syncManyField: GraphQLFieldConfig<{}, Context> = {
  type: GraphQLNonNull(GraphQLList(GraphQLNonNull(syncWithPubResultUnion))),
  description: "Sync many workspaces with many pubs",
  args: {
    workspaces: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(SyncInput))),
    },
  },
  async resolve(_root, args, ctx) {
    const operations = (args as {
      workspaces: {
        address: string;
        pubs: string[];
      }[];
    }).workspaces.flatMap((workspace) => {
      return workspace.pubs.map((url) => ({
        address: workspace.address,
        pubUrl: url,
      }));
    });

    const results = await Promise.all(
      operations.map((op) => {
        return syncWorkspace(op.address, op.pubUrl, ctx);
      })
    );

    return results;
  },
};
