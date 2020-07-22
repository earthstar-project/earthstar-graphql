import { decodeFromId } from "./interfaces/node";
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
import { queryType, arg, idArg, stringArg } from "@nexus/schema";

export const Query = queryType({
  definition(t) {
    t.field("node", {
      type: "Node",
      args: {
        id: idArg({ required: true }),
      },
      nullable: true,
      resolve(_root, args, ctx) {
        const { typename, localId } = decodeFromId(args.id);

        switch (typename) {
          case "Author":
            return getAuthor(localId, ctx) || null;
          case "Workspace":
            return getWorkspace(localId, ctx) || null;
          case "ES3Document":
            return getDocument(localId, ctx) || null;
          default:
            return null;
        }
      },
    });
    t.field("workspace", {
      type: "Workspace",
      args: {
        address: arg({
          type: "String",
          nullable: false,
        }),
      },
      nullable: true,
      description: "Look up a workspace using its path, e.g. +gardening.123456",
      resolve(_root, args, ctx) {
        return getWorkspace(args.address, ctx) || null;
      },
    });

    t.list.field("workspaces", {
      description: "Return a list of locally stored workspaces",
      type: "Workspace",
      nullable: false,
      args: {
        sortedBy: arg({
          type: "WorkspaceSortOrder",
          required: false,
        }),
      },
      resolve(_root, args, ctx) {
        return sortWorkspaces(ctx.workspaces, args.sortedBy);
      },
    });

    t.field("document", {
      type: "Document",
      description:
        "Look up a document using its path, e.g. +gardening.123/tomato",
      nullable: true,
      args: {
        path: stringArg({ required: true }),
      },
      resolve(_root, args, ctx) {
        return getDocument(args.path, ctx);
      },
    });

    t.list.field("documents", {
      type: "Document",
      description:
        "Return a list of all documents from all locally stored workspaces",
      nullable: false,
      args: {
        sortedBy: arg({
          type: "DocumentSortOrder",
          required: false,
        }),
      },
      resolve(_root, args, ctx) {
        const docs = getAllDocuments(ctx);

        return sortDocuments(docs, args.sortedBy);
      },
    });

    t.field("author", {
      type: "Author",
      description:
        "Look up an author by address, e.g. @suzy.6efJ8v8rtwoBxfN5MKeTF2Qqyf6zBmwmv8oAbendBZHP",
      nullable: true,
      args: {
        address: stringArg({
          required: true,
        }),
      },
      resolve(_root, args, ctx) {
        return getAuthor(args.address, ctx);
      },
    });

    t.list.field("authors", {
      type: "Author",
      description:
        "Return a list of all authors from all locally stored workspaces",
      nullable: false,
      args: {
        sortedBy: arg({
          type: "AuthorSortOrder",
          required: false,
        }),
      },
      resolve(_root, args, ctx) {
        const authors = getAllAuthors(ctx);

        return sortAuthors(authors, ctx, args.sortedBy);
      },
    });
  },
});
