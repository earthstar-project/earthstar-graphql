import { ValidatorEs3, StorageSqlite, StorageMemory } from "earthstar";
import {
  Context,
  AddWorkspaceCheck,
  SqliteContext,
  MemoryContext,
} from "./types";

export const IS_NODE = typeof process === "object";

export const VALIDATORS = [ValidatorEs3];

export function makeMemoryContext(
  workspaceAddresses: string[],
  canAddWorkspace?: AddWorkspaceCheck
): MemoryContext {
  return {
    storageMode: "MEMORY",
    workspaces: workspaceAddresses.map(
      (addr) => new StorageMemory(VALIDATORS, addr)
    ),
    canAddWorkspace: canAddWorkspace ? canAddWorkspace : () => true,
  };
}

export async function makeSqliteContext(
  workspaceAddresses: string[],
  getWorkspacePath: (address: string) => string,
  canAddWorkspace?: AddWorkspaceCheck
): Promise<SqliteContext> {
  const nodePath = await import("path");

  return {
    storageMode: "SQLITE",
    workspaces: workspaceAddresses.map((address) => {
      return new StorageSqlite({
        mode: "create-or-open",
        validators: VALIDATORS,
        filename: nodePath.resolve(getWorkspacePath(address)),
        workspace: address,
      });
    }),
    canAddWorkspace: canAddWorkspace ? canAddWorkspace : () => true,
    getWorkspacePath,
  };
}
