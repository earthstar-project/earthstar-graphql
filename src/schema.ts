import { makeSchema } from "@nexus/schema";
import path from "path";
import * as types from "./types/index";

export default makeSchema({
  types,
  outputs: {
    schema: path.join(__dirname, "./__generated__/es-schema.graphql"),
    typegen: path.join(__dirname, "./__generated__/nexus.ts"),
  },
  typegenAutoConfig: {
    sources: [
      {
        source: path.join(__dirname, "./typeDefs.ts"),
        alias: "t",
      },
    ],
    contextType: "t.Context",
  },
});
