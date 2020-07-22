import makeServer from "../make-server";
import { makeSqliteContext } from "../context";
import fs from "fs";
import path from "path";

export function isDefined<T>(t: T | undefined): t is T {
  return t !== undefined;
}

const workspacesDir = path.resolve("./workspaces/");
const sqliteRegex = /.*\/?(\+.*\.*)\.sqlite/;

if (!fs.existsSync(workspacesDir)) {
  fs.mkdirSync(workspacesDir);
}

const workspaces = fs
  .readdirSync(workspacesDir)
  .filter((fileName) => fileName.match(sqliteRegex))
  .map((fileName) => {
    const result = sqliteRegex.exec(fileName);

    if (result) {
      return { address: result[1], path: `./workspaces/${fileName}` };
    }

    return undefined;
  })
  .filter(isDefined);

const ctx = makeSqliteContext(workspaces);

const server = makeServer(ctx);

server
  .listen({
    port: 4000,
  })
  .then(({ url }) => {
    console.log(`🍄 earthstar-graphql ready at ${url}`);
  });
