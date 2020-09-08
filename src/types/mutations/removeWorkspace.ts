import {
  GraphQLFieldConfig,
  GraphQLNonNull,
  GraphQLString,
  GraphQLUnionType,
  GraphQLObjectType,
} from "graphql";
import { Context } from "../../types";
import { notPermittedResult } from "./common";
import authorInputType from "../inputs/authorInput";

export const workspaceRemovedResultType = new GraphQLObjectType({
  name: "WorkspaceRemovedResult",
  description: "Describes a successful removal of a workspace",
  fields: {
    address: {
      type: GraphQLNonNull(GraphQLString),
      description: "The address of the removed workspace",
    },
  },
});

export const removeWorkspaceResultUnion = new GraphQLUnionType({
  name: "RemoveWorkspaceResult",
  description: "A possible result for removing a workspace",
  types: [workspaceRemovedResultType, notPermittedResult],
  resolveType(item) {
    return item.__type;
  },
});

export const removeWorkspaceField: GraphQLFieldConfig<{}, Context> = {
  type: GraphQLNonNull(removeWorkspaceResultUnion),
  description:
    "Attempt to remove an existing workspace from the current context",
  args: {
    workspaceAddress: {
      type: GraphQLNonNull(GraphQLString),
      description: "The address of the workspace to remove",
    },
    author: {
      type: authorInputType,
      description:
        "The author wishing to remove the workspace, possibly used to authorise this operation depending on the configuration",
    },
  },
  async resolve(_root, args, ctx) {
    const maybeExistingWorkspace = ctx.workspaces.find(
      (ws) => ws.workspace === args.workspaceAddress
    );

    if (!maybeExistingWorkspace) {
      return {
        __type: notPermittedResult,
        reason:
          "The workspace for the given address does not exist in this context",
      };
    }

    if (ctx.canRemoveWorkspace(args.workspaceAddress, args.author) === false) {
      return {
        __type: notPermittedResult,
        reason: null,
      };
    }

    const nextWorkspaces = ctx.workspaces.filter((ws) => {
      ws.workspace !== args.workspaceAddress;
    });

    ctx.workspaces = nextWorkspaces;

    return {
      __type: workspaceRemovedResultType,
      address: args.workspaceAddress,
    };
  },
};
