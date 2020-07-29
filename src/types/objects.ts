import {
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLFloat,
  GraphQLUnionType,
  GraphQLInt,
} from "graphql";
import { ESAuthor, ES3Document, ESWorkspace } from "../types";
import { Context } from "../types";
import { encodeToId, nodeInterface } from "./interfaces/node";
import {
  getAuthorShortname,
  sortDocuments,
  getAuthorDocuments,
  getAuthorWorkspaces,
  sortWorkspaces,
  getDocumentWorkspace,
  getWorkspaceName,
  getWorkspaceAuthor,
  getWorkspaceAuthors,
  sortAuthors,
} from "../util";
import { jsonScalarType } from "./scalars/json";

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

export const authorType = new GraphQLObjectType<ESAuthor, Context>({
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
    address: {
      type: GraphQLNonNull(GraphQLString),
      description:
        "The author's full address, made of short name and public key, e.g. @suzy.6efJ8v8rtwoBxfN5MKeTF2Qqyf6zBmwmv8oAbendBZHP",
      resolve(root) {
        return root.address;
      },
    },
    documents: {
      type: GraphQLNonNull(GraphQLList(documentUnionType)),
      description:
        "Return a list of documents from this author. If the author is queried within the context of a workspace, only their documents from that workspace will be returned",
      args: {
        sortedBy: {
          type: documentSortEnum,
          description:
            "The order to return the documents in, defaults to OLDEST",
        },
      },
      resolve(root, args, ctx) {
        return sortDocuments(getAuthorDocuments(root, ctx), args.sortedBy);
      },
    },
    workspaces: {
      type: GraphQLNonNull(GraphQLList(workspaceType)),
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

export const documentFormatEnum = new GraphQLEnumType({
  name: "DocumentFormat",
  values: {
    ES3: {
      value: "es.3",
      description: "The third earthstar format!",
    },
  },
});

export const documentSortEnum = new GraphQLEnumType({
  name: "DocumentSortOrder",
  description: "A value describing how a list of documents will be ordered",
  values: {
    NEWEST: {
      description: "Order documents by those updated most recently",
    },
    OLDEST: {
      description: "Order documents by those updated least recently",
    },
  },
});

export const unknownFormatDocumentObject = new GraphQLObjectType({
  name: "UnknownFormatDocument",
  description:
    "Returned when the format of the document is not recognised by any of the validators used by this GraphQL server",
  fields: () => ({
    data: {
      type: jsonScalarType,
      resolve(root) {
        return root;
      },
    },
  }),
});

export const es3DocumentType = new GraphQLObjectType<ES3Document, Context>({
  name: "ES3Document",
  description: "A document following the ES3 validation format",
  fields: () => ({
    id: {
      type: GraphQLNonNull(GraphQLID),
      resolve(root) {
        return encodeToId("ES3Document", `${root.workspace}${root.path}`);
      },
    },
    value: {
      type: GraphQLNonNull(GraphQLString),
      description: "The current value of this document",
      resolve(root) {
        return root.value;
      },
    },
    timestamp: {
      type: GraphQLNonNull(GraphQLFloat),
      description:
        "The number of microseconds since the UNIX era began that this document was published",
      resolve(root) {
        return root.timestamp;
      },
    },
    signature: {
      type: GraphQLNonNull(GraphQLString),
      description:
        "The signature of this document that verifies its authenticity",
      resolve(root) {
        return root.signature;
      },
    },
    path: {
      type: GraphQLNonNull(GraphQLString),
      description:
        "A string identifying this document like a path in a filesystem, e.g. /wiki/bees",
      resolve(root) {
        return root.path;
      },
    },
    workspacePath: {
      type: GraphQLNonNull(GraphQLString),
      description:
        "A string identifying this document like a path in a filesystem, prefixed with the workspace e.g. +gardening.123456/wiki/bees",
      resolve(root) {
        return `${root.workspace}${root.path}`;
      },
    },
    author: {
      type: GraphQLNonNull(authorType),
      description: "The last author who published to this path",
      resolve(root) {
        return { address: root.author, fromWorkspace: root.workspace };
      },
    },
    workspace: {
      type: GraphQLNonNull(workspaceType),
      description: "The workspace this document belongs to",
      resolve(root, _args, ctx) {
        return getDocumentWorkspace(root, ctx);
      },
    },
  }),
  interfaces: [nodeInterface],
});

export const documentUnionType = new GraphQLUnionType({
  name: "Document",
  description: "A document published by authors to a workspace",
  types: [es3DocumentType, unknownFormatDocumentObject],
});

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

export const workspaceType = new GraphQLObjectType<ESWorkspace, Context>({
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
