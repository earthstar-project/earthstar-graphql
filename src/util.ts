import {
  Document,
  IStorage,
  StorageSqlite,
  StorageMemory,
  isErr,
  syncLocalAndHttp,
} from "earthstar";
import {
  Context,
  DocumentSortOrder,
  ESAuthor,
  AuthorSortOrder,
  WorkspaceSortOrder,
  SyncFiltersArg,
  IngestResult,
} from "./types";
import { VALIDATORS } from "./create-schema-context";
import syncGraphql, { isGraphQlPub } from "./sync-graphql";
import {
  syncErrorType,
  detailedSyncSuccessType,
  workspaceNotFoundErrorObject,
  syncSuccessType,
  rejectedDocumentIngestionType,
  ignoredDocumentIngestionType,
  acceptedDocumentIngestionType,
} from "./types/mutations/common";

const workspaceDocPathRegex = /(\+.*\..[^\/]*)(.*)/;

// Document utilities

export function ingestDocuments(storage: IStorage, documents: Document[]) {
  return documents.map((document: Document) => {
    const result = storage.ingestDocument(document);

    if (isErr(result)) {
      return {
        document,
        rejectionReason: result.message,
        result: "REJECTED" as IngestResult,
      };
    }

    return {
      document,
      result: result as IngestResult,
    };
  });
}

export function getDocument(path: string, ctx: Context) {
  const result = workspaceDocPathRegex.exec(path);

  if (result && result.length > 2) {
    const workspace = ctx.workspaces.find((ws) => ws.workspace === result[1]);

    if (!workspace) {
      return null;
    }

    return workspace.getDocument(result[2]) || null;
  }

  return null;
}

export async function getDocumentWorkspace(
  doc: Document,
  ctx: Context
): Promise<IStorage> {
  const workspace = ctx.workspaces.find((workspace) => {
    return workspace.workspace === doc.workspace;
  });

  if (!workspace) {
    return await initWorkspace(doc.workspace, ctx);
  }

  return workspace;
}

export async function initWorkspace(address: string, ctx: Context) {
  switch (ctx.storageMode) {
    case "SQLITE":
      const path = await import("path");
      return new StorageSqlite({
        mode: "create-or-open",
        validators: VALIDATORS,
        filename: path.resolve(ctx.getWorkspacePath(address)),
        workspace: address,
      });
    default:
      return new StorageMemory(VALIDATORS, address);
  }
}

export function getAllDocuments(
  ctx: Context,
  options?: { filters?: SyncFiltersArg; includeDeleted?: boolean }
): Document[] {
  return ctx.workspaces.flatMap((workspace) => {
    return getWorkspaceDocuments(workspace, options);
  });
}

export function sortDocuments(
  documents: Document[],
  sortBy: DocumentSortOrder | null | undefined
) {
  return [...documents].sort((aDoc, bDoc) => {
    switch (sortBy) {
      case "NEWEST":
        return aDoc.timestamp > bDoc.timestamp ? -1 : 1;
      default:
        return aDoc.timestamp < bDoc.timestamp ? -1 : 1;
    }
  });
}

// Author utilities

export function getAuthor(address: string, ctx: Context) {
  return (
    getAllAuthors(ctx).find((author) => author.address === address) || null
  );
}

export function getDisplayNamePath(addr: string) {
  return `/about/${addr}/name`;
}

export function getAuthorDisplayName(address: string, workspace: IStorage) {
  return workspace.getContent(getDisplayNamePath(address));
}

const authorNameRegex = /@(.*)\./;

export function getAuthorShortname(address: string): string {
  const result = authorNameRegex.exec(address);

  if (result) {
    return result[1];
  }

  return address;
}

export function getAllAuthors(ctx: Context) {
  return Array.from(
    new Set(
      ctx.workspaces.flatMap((workspace) => {
        return workspace.authors();
      })
    )
  ).map((address) => ({ address }));
}

export function getAuthorDocuments(
  author: ESAuthor,
  ctx: Context,
  options?: {
    filters?: Pick<SyncFiltersArg, "pathPrefixes">;
    includeDeleted?: boolean;
  }
): Document[] {
  const workspaces = author.fromWorkspace
    ? ctx.workspaces.filter((ws) => author.fromWorkspace === ws.workspace)
    : ctx.workspaces;

  return workspaces.flatMap((workspace) => {
    if (!workspace.authors().includes(author.address)) {
      return [];
    }

    return getWorkspaceDocuments(workspace, options);
  });
}

export function getAuthorWorkspaces(authorAddress: string, ctx: Context) {
  return ctx.workspaces.filter((workspace) => {
    return workspace.authors().includes(authorAddress);
  });
}

export function authorLastPublishedTimestamp(
  author: ESAuthor,
  ctx: Context
): number {
  const documents = getAuthorDocuments(author, ctx);

  documents.sort((aDoc, bDoc) => {
    return aDoc.timestamp > bDoc.timestamp ? -1 : 1;
  });

  return documents.length > 0 ? documents[0].timestamp : 0;
}

export function sortAuthors(
  authors: ESAuthor[],
  ctx: Context,
  sortBy: AuthorSortOrder | undefined | null
): ESAuthor[] {
  return [...authors].sort((aAuthor, bAuthor) => {
    switch (sortBy) {
      case "NAME_ASC":
        return aAuthor.address < bAuthor.address ? -1 : 1;
      case "NAME_DESC":
        return aAuthor.address > bAuthor.address ? -1 : 1;
      case "LAST_PUBLISHED_ASC":
        return authorLastPublishedTimestamp(aAuthor, ctx) <
          authorLastPublishedTimestamp(bAuthor, ctx)
          ? -1
          : 1;
      default:
        return authorLastPublishedTimestamp(aAuthor, ctx) >
          authorLastPublishedTimestamp(bAuthor, ctx)
          ? -1
          : 1;
    }
  });
}

// Workspace utilities

export function getWorkspace(address: string, ctx: Context) {
  return ctx.workspaces.find((workspace) => {
    return workspace.workspace === address;
  });
}

const workspaceNameRegex = /\+(.*)\./;

export function getWorkspaceName(address: string) {
  const result = workspaceNameRegex.exec(address);

  if (result) {
    return result[1];
  }

  return address;
}

export function getWorkspaceAuthor(workspace: IStorage, authorAddress: string) {
  const address = workspace
    .authors()
    .find((address) => authorAddress === address);

  if (address) {
    return {
      address,
      fromWorkspace: workspace.workspace,
    };
  }

  return null;
}

export function getWorkspaceAuthors(workspace: IStorage) {
  return workspace
    .authors()
    .map((address) => ({ address, fromWorkspace: workspace.workspace }));
}

function includeDeletedFilter(includeDeleted: boolean) {
  return (doc: Document) => {
    return includeDeleted ? true : doc.content !== "";
  };
}

export function getWorkspaceDocuments(
  workspace: IStorage,
  options?: {
    filters?: SyncFiltersArg;
    includeDeleted?: boolean;
  }
): Document[] {
  if (!options) {
    return workspace.documents().filter(includeDeletedFilter(false));
  }

  const { filters, includeDeleted } = options;

  const isFiltered = filters
    ? filters.pathPrefixes || filters.versionsByAuthors
    : false;

  if (!isFiltered) {
    return workspace.documents().filter(includeDeletedFilter(!!includeDeleted));
  }

  const byAuthorDocuments =
    filters && filters.versionsByAuthors
      ? filters.versionsByAuthors.flatMap((author) => {
          return workspace.documents({ versionsByAuthor: author });
        })
      : [];

  const prefixPathDocuments =
    filters && filters.pathPrefixes
      ? filters.pathPrefixes.flatMap((pathPrefix) => {
          return workspace.documents({ pathPrefix });
        })
      : [];

  return [...byAuthorDocuments, ...prefixPathDocuments].filter(
    includeDeletedFilter(!!includeDeleted)
  );
}

export function workspaceLastActivityTimestamp(workspace: IStorage): number {
  const documents = workspace.documents();

  documents.sort((aDoc, bDoc) => {
    return aDoc.timestamp > bDoc.timestamp ? -1 : 1;
  });

  return documents.length > 0 ? documents[0].timestamp : 0;
}

export function sortWorkspaces(
  workspaces: IStorage[],
  sortBy: WorkspaceSortOrder | null | undefined
): IStorage[] {
  return workspaces.sort((aWorkspace, bWorkspace) => {
    switch (sortBy) {
      case "NAME_ASC":
        return aWorkspace.workspace < bWorkspace.workspace ? -1 : 1;
      case "NAME_DESC":
        return aWorkspace.workspace > bWorkspace.workspace ? -1 : 1;
      case "POPULATION_ASC":
        return aWorkspace.authors().length < bWorkspace.authors().length
          ? -1
          : 1;
      case "POPULATION_DESC":
        return aWorkspace.authors().length > bWorkspace.authors().length
          ? -1
          : 1;
      case "LAST_ACTIVITY_ASC":
        return workspaceLastActivityTimestamp(aWorkspace) <
          workspaceLastActivityTimestamp(bWorkspace)
          ? -1
          : 1;
      default:
        return workspaceLastActivityTimestamp(aWorkspace) >
          workspaceLastActivityTimestamp(bWorkspace)
          ? -1
          : 1;
    }
  });
}

// Mutations

export async function syncWorkspace(
  address: string,
  pubUrl: string,
  ctx: Context
) {
  const maybeStorage = ctx.workspaces.find(
    (wsStorage) => wsStorage.workspace === address
  );

  if (maybeStorage === undefined && !ctx.canAddWorkspace(address)) {
    return {
      __type: workspaceNotFoundErrorObject,
      address: address,
    };
  }

  const storageToUse = maybeStorage
    ? maybeStorage
    : await initWorkspace(address, ctx);

  const shouldUseGraphqlSync = await isGraphQlPub(pubUrl);

  if (shouldUseGraphqlSync) {
    const result = await syncGraphql(storageToUse, pubUrl, ctx.syncFilters);

    if (isErr(result)) {
      return {
        __type: syncErrorType,
        reason: result.message,
      };
    }

    ctx.workspaces.push(storageToUse);

    return {
      __type: detailedSyncSuccessType,
      syncedWorkspace: maybeStorage,
      pushed: {
        ...result.pushed,
        documents: result.pushed.documents.map((doc) => ({
          ...doc,
          __type:
            doc.result === "REJECTED"
              ? rejectedDocumentIngestionType
              : doc.result === "ACCEPTED"
              ? acceptedDocumentIngestionType
              : ignoredDocumentIngestionType,
        })),
      },
      pulled: result.pulled,
    };
  }
  const result = await syncLocalAndHttp(storageToUse, pubUrl);

  if (isErr(result)) {
    return {
      __type: syncErrorType,
      reason: result.message,
    };
  }

  ctx.workspaces.push(storageToUse);

  return {
    __type: syncSuccessType,
    syncedWorkspace: storageToUse,
  };
}
