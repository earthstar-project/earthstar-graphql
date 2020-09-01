import {
  GraphQLInputObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
} from "graphql";

export default new GraphQLInputObjectType({
  name: "SyncInput",
  description: "A description of a workspace and the pubs to sync with",
  fields: {
    address: {
      type: GraphQLNonNull(GraphQLString),
      description: "The address of the workspace to sync",
    },
    pubs: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString))),
      description: "The pubs to sync the workspace with",
    },
  },
});
