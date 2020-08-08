import {
  GraphQLUnionType,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLFieldConfig,
} from "graphql";
import { documentUnionType } from "../object-types/document";
import { workspaceNotFoundErrorObject } from "./common";
import { Context } from "../../types";
import { isErr } from "earthstar";
import authorInputType from "../inputs/authorInput";
import newDocumentInputType from "../inputs/newDocumentInput";

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

export const documentRejectedErrorObject = new GraphQLObjectType({
  name: "DocumentRejectedError",
  description:
    "A result indicating that the document was rejected from being set to the workspace, e.g. because it was signed improperly. The reason will always be unknown, until I can work out how to get richer data!",
  fields: {
    errorName: {
      type: GraphQLNonNull(GraphQLString),
      description: "The type name of the Earthstar Error",
    },
    reason: {
      type: GraphQLNonNull(GraphQLString),
      description: "The reason for this error",
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

export const setField: GraphQLFieldConfig<{}, Context> = {
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

    const setResult = ws.set(args.author, {
      format: args.document.format || "es.4",
      content: args.document.content,
      path: args.document.path,
    });

    if (isErr(setResult)) {
      return {
        __type: documentRejectedErrorObject,
        errorName: setResult.name,
        reason: setResult.message,
      };
    }

    return {
      __type: setDataSuccessResultObject,
      document: ctx.workspaces
        .find((ws) => ws.workspace === args.workspace)
        ?.getDocument(args.document.path),
    };
  },
};
