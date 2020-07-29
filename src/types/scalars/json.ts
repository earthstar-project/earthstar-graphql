import { GraphQLJSONObject } from "graphql-type-json";

import { GraphQLScalarType } from "graphql";

export const jsonScalarType = new GraphQLScalarType({
  name: "JSON",
  serialize: GraphQLJSONObject.serialize,
  parseValue: GraphQLJSONObject.parseValue,
  parseLiteral: GraphQLJSONObject.parseLiteral,
});
