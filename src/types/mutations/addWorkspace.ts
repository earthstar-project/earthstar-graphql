import {
  GraphQLFieldConfig,
  GraphQLNonNull,
  GraphQLString,
  GraphQLUnionType,
  GraphQLObjectType,
} from "graphql";
import { Context } from "../../types";
import { isErr } from "earthstar";
import authorInputType from "../inputs/authorInput";
import { workspaceType } from "../object-types/workspace";
import { notPermittedResult } from "./common";
import { initWorkspace } from "../../util";

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

export const addWorkspaceField: GraphQLFieldConfig<{}, Context> = {
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

    try {
      const newStorage = await initWorkspace(args.workspaceAddress, ctx);

      ctx.workspaces.push(newStorage);

      return {
        __type: workspaceAddedResultType,
        workspace: newStorage,
      };
    } catch (err) {
      if (isErr(err)) {
        return {
          __type: notPermittedResult,
          reason: err.message,
        };
      }

      return {
        __type: notPermittedResult,
        reason: "Something went wrong!",
      };
    }
  },
};
