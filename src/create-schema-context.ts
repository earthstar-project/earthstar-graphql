import { ValidatorEs3, StorageSqlite, StorageMemory } from "earthstar";
import {
  Context,
  AddWorkspaceCheck,
  SqliteContext,
  MemoryContext,
  SyncFilters,
  StorageType,
} from "./types";

export const VALIDATORS = [ValidatorEs3];

type CommonContextOptions = {
  workspaceAddresses: string[];
  canAddWorkspace?: AddWorkspaceCheck;
  syncFilters?: SyncFilters;
};

type SqliteContextOptions = {
  getWorkspacePath: (address: string) => string;
} & CommonContextOptions;

type ContextOptions = CommonContextOptions | SqliteContextOptions;

const EMPTY_SYNC_FILTERS = {
  pathPrefixes: [],
  versionsByAuthors: [],
};

export default function createSchemaContext(
  mode: "MEMORY",
  options: CommonContextOptions
): MemoryContext;
export default function createSchemaContext(
  mode: "SQLITE",
  options: SqliteContextOptions
): SqliteContext;
export default function createSchemaContext(
  mode: StorageType,
  options: ContextOptions
): Context {
  if (mode === "MEMORY") {
    return {
      storageMode: "MEMORY",
      workspaces: options.workspaceAddresses.map(
        (addr) => new StorageMemory(VALIDATORS, addr)
      ),
      canAddWorkspace: options.canAddWorkspace
        ? options.canAddWorkspace
        : () => true,
      syncFilters: options.syncFilters ?? EMPTY_SYNC_FILTERS,
    };
  }

  return {
    storageMode: "SQLITE",
    workspaces: options.workspaceAddresses.map((addr) => {
      return new StorageSqlite({
        mode: "create-or-open",
        validators: VALIDATORS,
        filename: (options as SqliteContextOptions).getWorkspacePath(addr),
        workspace: addr,
      });
    }),
    canAddWorkspace: options.canAddWorkspace
      ? options.canAddWorkspace
      : () => true,
    getWorkspacePath: (options as SqliteContextOptions).getWorkspacePath,
    syncFilters: options.syncFilters ?? EMPTY_SYNC_FILTERS,
  };
}
