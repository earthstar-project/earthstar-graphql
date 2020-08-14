import {
  getAuthorDocuments,
  getAuthorShortname,
  getAuthorWorkspaces,
  sortDocuments,
  sortWorkspaces,
  getAuthorLongName,
} from "../../util";
import {
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLList,
  GraphQLID,
  GraphQLBoolean,
} from "graphql";
import { nodeInterface, encodeToId } from "../interfaces/node";
import { ESAuthor, Context } from "../../types";
import { documentUnionType, documentSortEnum } from "./document";
import { workspaceSortEnum, workspaceType } from "./workspace";

export const authorSortEnum = new GraphQLEnumType({
  name: "AuthorSortOrder",
  description: "A value describing how a list of authors will be ordered",
  values: {
    NAME_ASC: {
      description: "Order authors by name, ascending",
    },
    NAME_DESC: {
      description: "Order authors by name, descending",
    },
    LAST_PUBLISHED_ASC: {
      description:
        "Order authors by their last known published document, least recent first",
    },
    LAST_PUBLISHED_DESC: {
      description:
        "Order authors by their last known published document, most recent first",
    },
  },
});

export const authorType: GraphQLObjectType = new GraphQLObjectType<
  ESAuthor,
  Context
>({
  name: "Author",
  description: "A person identified by a public key",
  fields: () => ({
    id: {
      type: GraphQLNonNull(GraphQLID),
      resolve(root) {
        return encodeToId("Author", root.address);
      },
    },
    shortName: {
      type: GraphQLNonNull(GraphQLString),
      description:
        "The author's short name without their public key, e.g. suzy",
      resolve(root) {
        return getAuthorShortname(root.address);
      },
    },
    longName: {
      type: GraphQLString,
      description:
        "The author's display name. This is particular to a given workspace.",
      resolve(root, _args, ctx) {
        if (!root.fromWorkspace) {
          return null;
        }

        const maybeStorage = ctx.workspaces.find(
          (ws) => ws.workspace === root.fromWorkspace
        );

        if (!maybeStorage) {
          return null;
        }

        return getAuthorLongName(root.address, maybeStorage) || null;
      },
    },
    address: {
      type: GraphQLNonNull(GraphQLString),
      description:
        "The author's full address, made of short name and public key, e.g. @suzy.6efJ8v8rtwoBxfN5MKeTF2Qqyf6zBmwmv8oAbendBZHP",
      resolve(root) {
        return root.address;
      },
    },
    documents: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(documentUnionType))),
      description:
        "Return a list of documents from this author. If the author is queried within the context of a workspace, only their documents from that workspace will be returned",
      args: {
        sortedBy: {
          type: documentSortEnum,
          description:
            "The order to return the documents in, defaults to OLDEST",
        },
        pathPrefixes: {
          type: GraphQLList(GraphQLNonNull(GraphQLString)),
          description:
            "Paths which all returned docs must have at the beginning of their paths",
        },
        includeDeleted: {
          type: GraphQLBoolean,
          description: "Whether to include deleted documents or not",
        },
      },
      resolve(root, args, ctx) {
        return sortDocuments(
          getAuthorDocuments(root, ctx, {
            filters: { pathPrefixes: args.pathPrefixes },
            includeDeleted: args.includeDeleted,
          }),
          args.sortedBy
        );
      },
    },
    workspaces: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(workspaceType))),
      description:
        "Return a list of workspaces this author has published documents to",
      args: {
        sortedBy: {
          type: workspaceSortEnum,
          description:
            "The order to return the workspaces in, defaults to LAST_ACTIVITY_DESC",
        },
      },
      resolve(root, args, ctx) {
        const workspaces = getAuthorWorkspaces(root.address, ctx);

        return sortWorkspaces(workspaces, args.sortedBy);
      },
    },
  }),
  interfaces: [nodeInterface],
});
