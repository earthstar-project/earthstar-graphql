import { IStorage, Document } from "earthstar";

export type StorageType = "MEMORY" | "SQLITE";

export type Context = {
  storageMode: StorageType;
  workspaces: IStorage[];
};

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
export type ES3Document = Document;
