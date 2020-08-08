import { GraphQLSchema } from "graphql";
import { queryType } from "./types/query";
import { mutationType } from "./types/mutations/mutation";

export default new GraphQLSchema({
  query: queryType,
  mutation: mutationType,
});
