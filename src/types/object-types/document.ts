import { getDocumentWorkspace } from "../../util";
import { ES4Document, Context } from "../../types";
import {
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLUnionType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLFloat,
  GraphQLID,
} from "graphql";
import { nodeInterface, encodeToId } from "../interfaces/node";
import { authorType } from "./author";
import { workspaceType } from "./workspace";
import { jsonScalarType } from "../scalars/json";

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

export const es4DocumentType: GraphQLObjectType = new GraphQLObjectType<
  ES4Document,
  Context
>({
  name: "ES4Document",
  description: "A document following the ES4 validation format",
  fields: () => ({
    format: {
      type: GraphQLNonNull(GraphQLString),
      resolve() {
        return "es.4";
      },
    },
    id: {
      type: GraphQLNonNull(GraphQLID),
      resolve(root) {
        return encodeToId("ES4Document", `${root.workspace}${root.path}`);
      },
    },
    content: {
      type: GraphQLNonNull(GraphQLString),
      description: "The content of this document",
      resolve(root) {
        return root.content;
      },
    },
    contentHash: {
      type: GraphQLNonNull(GraphQLString),
      description: "A hash of this document's content",
      resolve(root) {
        return root.contentHash;
      },
    },
    deleteAfter: {
      type: GraphQLFloat,
      description: "A timestamp indicating when this document will be deleted",
      resolve(root) {
        return root.deleteAfter;
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
  types: [es4DocumentType, unknownFormatDocumentObject],
  resolveType(item) {
    if (item.format === "es.4") {
      return es4DocumentType;
    }

    return unknownFormatDocumentObject;
  },
});
