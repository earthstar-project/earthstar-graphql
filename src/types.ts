import { IStorage, Document, AuthorKeypair } from "earthstar";

export type StorageType = "MEMORY" | "SQLITE";

export type AddWorkspaceCheck = (
  workspaceAddress: string,
  author?: AuthorKeypair
) => boolean;

export type RemoveWorkspaceCheck = (
  workspaceAddress: string,
  author?: AuthorKeypair
) => boolean;

export type SyncFilters = {
  pathPrefixes: string[];
  versionsByAuthors: string[];
};

export type SyncFiltersArg = Partial<SyncFilters>;

export type ContextBase = {
  storageMode: StorageType;
  workspaces: IStorage[];
  canAddWorkspace: AddWorkspaceCheck;
  canRemoveWorkspace: RemoveWorkspaceCheck;
  isPub: boolean;
  syncFilters: SyncFiltersArg;
};

export interface MemoryContext extends ContextBase {
  storageMode: "MEMORY";
}

export interface SqliteContext extends ContextBase {
  storageMode: "SQLITE";
  getWorkspacePath: (address: string) => string;
}

export type Context = MemoryContext | SqliteContext;

export type WorkspaceSortOrder =
  | "NAME_ASC"
  | "NAME_DESC"
  | "LAST_ACTIVITY_DESC"
  | "LAST_ACTIVITY_ASC"
  | "POPULATION_ASC"
  | "POPULATION_DESC";

export type AuthorSortOrder =
  | "NAME_ASC"
  | "NAME_DESC"
  | "LAST_PUBLISHED_ASC"
  | "LAST_PUBLISHED_DESC";

export type DocumentSortOrder = "NEWEST" | "OLDEST";

export type ESWorkspace = IStorage;

export type ESAuthor = {
  address: string;
  fromWorkspace?: string;
};
export type ES4Document = Document;

export type IngestResult = "ACCEPTED" | "IGNORED" | "REJECTED";
