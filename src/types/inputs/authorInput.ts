import { GraphQLInputObjectType, GraphQLString, GraphQLNonNull } from "graphql";

export default new GraphQLInputObjectType({
  name: "AuthorInput",
  description: "An input for signing documents by a specific author",
  fields: {
    address: {
      type: GraphQLNonNull(GraphQLString),
      description:
        "The full address of the author, e.g. @suzy.6efJ8v8rtwoBxfN5MKeTF2Qqyf6zBmwmv8oAbendBZHP",
    },
    secret: {
      type: GraphQLNonNull(GraphQLString),
      description: "The author's secret key, used for signing",
    },
  },
});
