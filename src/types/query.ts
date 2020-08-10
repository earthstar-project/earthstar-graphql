import { decodeFromId, nodeInterface } from "./interfaces/node";
import {
  getAuthor,
  getWorkspace,
  getDocument,
  getAllAuthors,
  getAllDocuments,
  sortWorkspaces,
  sortDocuments,
  sortAuthors,
} from "../util";
import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
} from "graphql";
import { Context } from "../types";
import { authorType, authorSortEnum } from "./object-types/author";
import { documentUnionType, documentSortEnum } from "./object-types/document";
import { workspaceType, workspaceSortEnum } from "./object-types/workspace";
import { syncFiltersObject } from "./object-types/sync-filters";

export const queryType = new GraphQLObjectType<{}, Context>({
  name: "Query",
  description: "The root query type",
  fields: {
    node: {
      description: "Fetch an object using a GUID",
      type: nodeInterface,
      args: {
        id: {
          type: GraphQLNonNull(GraphQLString),
        },
      },
      resolve(_root, args, ctx) {
        const { typename, localId } = decodeFromId(args.id);

        switch (typename) {
          case "Author":
            return getAuthor(localId, ctx) || null;
          case "Workspace":
            return getWorkspace(localId, ctx) || null;
          case "ES4Document":
            return getDocument(localId, ctx) || null;
          default:
            return null;
        }
      },
    },
    syncFilters: {
      type: GraphQLNonNull(syncFiltersObject),
      resolve(_root, _args, ctx) {
        return ctx.syncFilters;
      },
    },
    author: {
      type: authorType,
      description:
        "Look up an author by address, e.g. @suzy.6efJ8v8rtwoBxfN5MKeTF2Qqyf6zBmwmv8oAbendBZHP",
      args: {
        address: {
          type: GraphQLNonNull(GraphQLString),
        },
      },
      resolve(_root, args, ctx) {
        return getAuthor(args.address, ctx);
      },
    },
    authors: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(authorType))),
      description:
        "Return a list of all authors from all locally stored workspaces",
      args: {
        sortedBy: {
          type: authorSortEnum,
        },
      },
      resolve(_root, args, ctx) {
        const authors = getAllAuthors(ctx);
        return sortAuthors(authors, ctx, args.sortedBy);
      },
    },
    document: {
      type: documentUnionType,
      description:
        "Look up a document using its path, e.g. +gardening.123/tomato",
      args: {
        path: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve(_root, args, ctx) {
        return getDocument(args.path, ctx);
      },
    },
    documents: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(documentUnionType))),
      description:
        "Return a list of all documents from all locally stored workspaces",
      args: {
        sortedBy: {
          type: documentSortEnum,
        },
        pathPrefixes: {
          type: GraphQLList(GraphQLNonNull(GraphQLString)),
          description:
            "Paths which all returned docs must have at the beginning of their paths",
        },
        versionsByAuthors: {
          type: GraphQLList(GraphQLNonNull(GraphQLString)),
          description:
            "A list of author addresses of authors who have created versions of these documents",
        },
        includeDeleted: {
          type: GraphQLBoolean,
          description: "Whether to include deleted documents or not",
        },
      },
      resolve(_root, args, ctx) {
        const docs = getAllDocuments(ctx, {
          filters: {
            pathPrefixes: args.pathPrefixes,
            versionsByAuthors: args.versionsByAuthors,
          },
          includeDeleted: args.includeDeleted,
        });
        return sortDocuments(docs, args.sortedBy);
      },
    },
    workspace: {
      type: workspaceType,
      description: "Look up a workspace using its path, e.g. +gardening.123456",
      args: {
        address: {
          type: GraphQLNonNull(GraphQLString),
        },
      },
      resolve(_root, args, ctx) {
        return getWorkspace(args.address, ctx) || null;
      },
    },
    workspaces: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(workspaceType))),
      description: "Return a list of locally stored workspaces",
      args: {
        sortedBy: {
          type: workspaceSortEnum,
        },
      },
      resolve(_root, args, ctx) {
        return sortWorkspaces(ctx.workspaces, args.sortedBy);
      },
    },
  },
});
