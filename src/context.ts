import { ValidatorEs3, StorageSqlite, StorageMemory } from "earthstar";
import { Context } from "./types";

export const IS_NODE = typeof process === "object";

export const VALIDATORS = [ValidatorEs3];

export function makeMemoryContext(addresses: string[]): Context {
  return {
    storageMode: "MEMORY",
    workspaces: addresses.map((addr) => new StorageMemory(VALIDATORS, addr)),
  };
}

export async function makeSqliteContext(
  workspaces: { address: string; path: string }[]
): Promise<Context> {
  const nodePath = await import("path");

  return {
    storageMode: "SQLITE",
    workspaces: workspaces.map(({ address, path }) => {
      return new StorageSqlite({
        mode: "create-or-open",
        validators: VALIDATORS,
        filename: nodePath.resolve(path),
        workspace: address,
      });
    }),
  };
}
