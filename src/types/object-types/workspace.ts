import {
  getWorkspaceName,
  getWorkspaceAuthors,
  getWorkspaceAuthor,
  sortAuthors,
  sortDocuments,
} from "../../util";
import {
  GraphQLEnumType,
  GraphQLObjectType,
  graphql,
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
} from "graphql";
import { nodeInterface, encodeToId } from "../interfaces/node";
import { ESWorkspace, Context } from "../../types";
import { authorType, authorSortEnum } from "./author";
import { documentUnionType, documentSortEnum } from "./document";

export const workspaceSortEnum = new GraphQLEnumType({
  name: "WorkspaceSortOrder",
  description: "A value describing how a list of documents will be ordered",
  values: {
    NAME_ASC: {
      description: "Order workspaces by their names in ascending order",
    },
    NAME_DESC: {
      description: "Order workspaces by their names in descending order",
    },
    LAST_ACTIVITY_ASC: {
      description: "Order workspaces by those with the most recent activity",
    },
    LAST_ACTIVITY_DESC: {
      description: "Order workspaces by those with the least recent activity",
    },
    POPULATION_ASC: {
      description:
        "Order workspaces by those with the least number of authors first",
    },
    POPULATION_DESC: {
      description:
        "Order workspaces by those with the least number of authors first",
    },
  },
});

export const workspaceType: GraphQLObjectType = new GraphQLObjectType<
  ESWorkspace,
  Context
>({
  name: "Workspace",
  fields: () => ({
    id: {
      type: GraphQLNonNull(GraphQLID),
      resolve(root) {
        return encodeToId("Workspace", root.workspace);
      },
    },
    name: {
      type: GraphQLNonNull(GraphQLString),
      description:
        "The name of the workspace, without the following random chars",
      resolve(root) {
        return getWorkspaceName(root.workspace);
      },
    },
    address: {
      type: GraphQLNonNull(GraphQLString),
      description: "The full address of the workspace",
      resolve(root) {
        return root.workspace;
      },
    },
    population: {
      type: GraphQLNonNull(GraphQLInt),
      description: "The number of authors who have published to this workspace",
      resolve(root) {
        return root.authors().length;
      },
    },
    author: {
      type: authorType,
      description:
        "Look up an author who has published to this workspace by their address, e.g. @suzy.6efJ8v8rtwoBxfN5MKeTF2Qqyf6zBmwmv8oAbendBZHP",
      args: {
        address: {
          type: GraphQLNonNull(GraphQLString),
        },
      },
      resolve(root, args) {
        return getWorkspaceAuthor(root, args.address);
      },
    },
    authors: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(authorType))),
      description: "A list of authors who have published to this workspace",
      args: {
        sortedBy: {
          type: authorSortEnum,
        },
      },
      resolve(root, args, ctx) {
        const authors = getWorkspaceAuthors(root);

        return sortAuthors(authors, ctx, args.sortedBy);
      },
    },
    document: {
      type: documentUnionType,
      description:
        "Look up a document in this workspace using its path, e.g. /games/chess",
      args: {
        path: {
          type: GraphQLNonNull(GraphQLString),
        },
      },
      resolve(root, args) {
        return root.getDocument(args.path) || null;
      },
    },
    documents: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(documentUnionType))),
      description: "A list of documents published in this workspace",
      args: {
        sortedBy: {
          type: documentSortEnum,
        },
      },
      resolve(root, args) {
        return sortDocuments(root.documents(), args.sortedBy);
      },
    },
  }),
  interfaces: [nodeInterface],
});
