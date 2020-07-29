import { GraphQLSchema } from "graphql";
import { queryType, mutationType } from "./types/index";

export default new GraphQLSchema({
  query: queryType,
  mutation: mutationType,
});
