import { ApolloServer } from "apollo-server";
import schema from "./schema";
import { Context } from "./typeDefs";

export default function makeServer(context: Context) {
  return new ApolloServer({ schema, context });
}
