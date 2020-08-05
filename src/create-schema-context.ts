import { ValidatorEs3, StorageSqlite, StorageMemory } from "earthstar";
import {
  Context,
  AddWorkspaceCheck,
  SqliteContext,
  MemoryContext,
  StorageType,
  SyncFiltersArg,
} from "./types";

export const VALIDATORS = [ValidatorEs3];

type CommonContextOptions = {
  workspaceAddresses: string[];
  canAddWorkspace?: AddWorkspaceCheck;
  syncFilters?: SyncFiltersArg;
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
      syncFilters: {
        ...EMPTY_SYNC_FILTERS,
        ...options.syncFilters,
      },
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
    syncFilters: {
      ...EMPTY_SYNC_FILTERS,
      ...options.syncFilters,
    },
  };
}
