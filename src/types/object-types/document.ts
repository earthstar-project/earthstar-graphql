import { getDocumentWorkspace } from "../../util";
import { enumType, objectType, unionType } from "@nexus/schema";
import { ES3Document as TES3Document } from "../../typeDefs";

export const DocumentFormat = enumType({
  name: "DocumentFormat",
  members: [
    {
      name: "ES3",
      value: "es.3",
      description: "The third earthstar format!",
    },
  ],
});

export const DocumentSortOrder = enumType({
  name: "DocumentSortOrder",
  rootTyping: "t.DocumentSortOrder",
  members: [
    {
      name: "NEWEST",
      description: "Order documents by those updated most recently",
    },
    {
      name: "OLDEST",
      description: "Order documents by those updated least recently",
    },
  ],
  description:
    "The order in which to look up the documents. The default is NEWEST",
});

export const UnknownFormatDocument = objectType({
  name: "UnknownFormatDocument",
  description:
    "Returned when the format of the document is not recognised by any of the validators used by this GraphQL server",
  definition(t) {
    t.field("data", {
      type: "JSON",
      resolve(root) {
        return root;
      },
    });
  },
});

export const Document = unionType({
  name: "Document",
  description: "A document published by authors to a workspace",
  definition(t) {
    t.members("ES3Document", "UnknownFormatDocument");
    t.resolveType((item) => {
      switch ((item as TES3Document).format) {
        case "es.3":
          return "ES3Document";
        default:
          return "UnknownFormatDocument";
      }
    });
  },
});

export const ES3Document = objectType({
  name: "ES3Document",
  description: "A document following the ES3 validation format",
  rootTyping: "t.ES3Document",
  definition(t) {
    t.implements("Node");
    t.string("value", {
      description: "The current value of this document",
      nullable: false,
    });
    t.float("timestamp", {
      description:
        "The number of microseconds since the UNIX era began that this document was published",
    });
    t.string("signature", {
      description:
        "The signature of this document that verifies its authenticity",
      nullable: false,
    });
    t.string("path", {
      description:
        "A string identifying this document like a path in a filesystem, e.g. /wiki/bees",
      nullable: false,
    }),
      t.string("workspacePath", {
        description:
          "A string identifying this document like a path in a filesystem, prefixed with the workspace e.g. +gardening.123456/wiki/bees",
        nullable: false,
        resolve(root) {
          return `${root.workspace}${root.path}`;
        },
      });
    t.field("author", {
      type: "Author",
      description: "The last author who published to this path",
      nullable: false,
      resolve(root) {
        return { address: root.author, fromWorkspace: root.workspace };
      },
    });
    t.field("workspace", {
      type: "Workspace",
      description: "The workspace this document belongs to",
      nullable: false,
      resolve(root, _args, ctx) {
        return getDocumentWorkspace(root, ctx);
      },
    });
  },
});
