import {
  getWorkspaceName,
  getWorkspaceAuthors,
  getWorkspaceAuthor,
  sortAuthors,
  sortDocuments,
} from "../../util";
import { enumType, objectType, arg, stringArg } from "@nexus/schema";

export const WorkspaceSortOrder = enumType({
  name: "WorkspaceSortOrder",
  rootTyping: "t.WorkspaceSortOrder",
  members: [
    {
      name: "NAME_ASC",
      description: "Order workspaces by their names in ascending order",
    },
    {
      name: "NAME_DESC",
      description: "Order workspaces by their names in descending order",
    },
    {
      name: "LAST_ACTIVITY_ASC",
      description: "Order workspaces by those with the most recent activity",
    },
    {
      name: "LAST_ACTIVITY_DESC",
      description: "Order workspaces by those with the least recent activity",
    },
    {
      name: "POPULATION_ASC",
      description:
        "Order workspaces by those with the least number of authors first",
    },
    {
      name: "POPULATION_DESC",
      description:
        "Order workspaces by those with the least number of authors first",
    },
  ],
  description:
    "The order in which to look up the workspaces. The default is LAST_ACTIVITY_DESC",
});

export const Workspace = objectType({
  name: "Workspace",
  rootTyping: "t.ESWorkspace",
  definition(t) {
    t.implements("Node");
    t.string("name", {
      nullable: false,
      description:
        "The name of the workspace, without the following random chars",
      resolve(root) {
        return getWorkspaceName(root.workspace);
      },
    });
    t.string("address", {
      description: "The full address of the workspace",
      nullable: false,
      resolve(root) {
        return root.workspace;
      },
    });
    t.list.field("authors", {
      type: "Author",
      description: "A list of authors who have published to this workspace",
      nullable: false,
      args: {
        sortedBy: arg({
          type: "AuthorSortOrder",
          required: false,
        }),
      },
      resolve(root, args, ctx) {
        const authors = getWorkspaceAuthors(root);

        return sortAuthors(authors, ctx, args.sortedBy);
      },
    });
    t.field("author", {
      type: "Author",
      description:
        "Look up an author who has published to this workspace by their address, e.g. @suzy.6efJ8v8rtwoBxfN5MKeTF2Qqyf6zBmwmv8oAbendBZHP",
      args: {
        address: stringArg({
          required: true,
        }),
      },
      nullable: true,
      resolve(root, args) {
        return getWorkspaceAuthor(root, args.address);
      },
    });
    t.field("document", {
      type: "Document",
      description:
        "Look up a document in this workspace using its path, e.g. /games/chess",
      args: {
        path: stringArg({
          required: true,
        }),
      },
      nullable: true,
      resolve(root, args) {
        return root.getDocument(args.path) || null;
      },
    });
    t.list.field("documents", {
      type: "Document",
      description: "A list of documents published in this workspace",
      nullable: false,
      args: {
        sortedBy: arg({
          type: "DocumentSortOrder",
          required: false,
        }),
      },
      resolve(root, args) {
        return sortDocuments(root.documents(), args.sortedBy);
      },
    });
    t.int("population", {
      description: "The number of authors who have published to this workspace",
      resolve(root) {
        return root.authors().length;
      },
    });
  },
});
