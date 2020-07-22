import {
  getAuthorDocuments,
  getAuthorShortname,
  getAuthorWorkspaces,
  sortDocuments,
  sortWorkspaces,
} from "../../util";
import { enumType, objectType, arg } from "@nexus/schema";

export const AuthorSortOrder = enumType({
  name: "AuthorSortOrder",
  rootTyping: "t.AuthorSortOrder",
  members: [
    { name: "NAME_ASC", description: "Order authors by name, ascending" },
    { name: "NAME_DESC", description: "Order authors by name, descending" },
    {
      name: "LAST_PUBLISHED_ASC",
      description:
        "Order authors by their last known published document, least recent first",
    },
    {
      name: "LAST_PUBLISHED_DESC",
      description:
        "Order authors by their last known published document, most recent first",
    },
  ],
  description:
    "The order in which to look up the authors. The default is LAST_PUBLISHED_DESC",
});

export const Author = objectType({
  name: "Author",
  description: "A person identified by a public key",
  rootTyping: "t.ESAuthor",
  definition(t) {
    t.implements("Node");
    t.string("shortName", {
      description:
        "The author's short name, without their public key, e.g. suzy",
      nullable: false,
      resolve(root) {
        return getAuthorShortname(root.address);
      },
    });
    t.string("address", {
      description:
        "The author's full address, made of short name and public key, e.g. @suzy.6efJ8v8rtwoBxfN5MKeTF2Qqyf6zBmwmv8oAbendBZHP",
      nullable: false,
      resolve(root) {
        return root.address;
      },
    });
    t.list.field("documents", {
      description:
        "Return a list of documents from this author. If the author is queried within the context of a workspace, only their documents from that workspace will be returned",
      nullable: false,
      type: "Document",
      args: {
        sortedBy: arg({
          type: "DocumentSortOrder",
          required: false,
        }),
      },
      resolve(root, args, ctx) {
        return sortDocuments(getAuthorDocuments(root, ctx), args.sortedBy);
      },
    });
    t.list.field("workspaces", {
      type: "Workspace",
      description:
        "Return a list of workspaces this author has published documents to",
      nullable: false,
      args: {
        sortedBy: arg({
          type: "WorkspaceSortOrder",
          required: false,
        }),
      },
      resolve(root, args, ctx) {
        const workspaces = getAuthorWorkspaces(root.address, ctx);

        return sortWorkspaces(workspaces, args.sortedBy);
      },
    });
  },
});
