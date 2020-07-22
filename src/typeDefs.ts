import { IStorage, Document } from "earthstar";

export type StorageType = "MEMORY" | "SQLITE";

export type Context = {
  storageMode: StorageType;
  workspaces: IStorage[];
};

export type ESWorkspace = IStorage;
export type WorkspaceSortOrder =
  | "NAME_ASC"
  | "NAME_DESC"
  | "LAST_ACTIVITY_DESC"
  | "LAST_ACTIVITY_ASC"
  | "POPULATION_ASC"
  | "POPULATION_DESC";

export type ESAuthor = {
  address: string;
  fromWorkspace?: string;
};

export type AuthorSortOrder =
  | "NAME_ASC"
  | "NAME_DESC"
  | "LAST_PUBLISHED_ASC"
  | "LAST_PUBLISHED_DESC";

export type DocumentSortOrder = "NEWEST" | "OLDEST";

export type ES3Document = Document;

// Some bullshit I have to do to satisfiy TS and nexus

export type SetDataSuccessResult = {
  document: Document;
  __typename: "SetDataSuccessResult";
};

export type DocumentRejectedError = {
  reason: string;
  __typename: "DocumentRejectedError";
};

export type WorkspaceNotFoundError = {
  __typename: "WorkspaceNotFoundError";
  address: string;
};
