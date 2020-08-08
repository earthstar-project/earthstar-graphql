import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLFloat,
} from "graphql";

export default new GraphQLInputObjectType({
  name: "DocumentInput",
  description: "An input for describing an existing document",
  fields: {
    format: {
      type: GraphQLNonNull(GraphQLString),
      description: "The format the existing document uses e.g. es.3",
    },
    workspace: {
      type: GraphQLNonNull(GraphQLString),
      description: "The address of the workspace this document belongs to",
    },
    content: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The content of the existing document, e.g. "I love honey!',
    },
    contentHash: {
      type: GraphQLNonNull(GraphQLString),
      description: "The hash of the document's content",
    },
    path: {
      type: GraphQLNonNull(GraphQLString),
      description: "The path of the existing document, e.g. /spices/pepper",
    },
    author: {
      type: GraphQLNonNull(GraphQLString),
      description: "The address of the existing's document author",
    },
    timestamp: {
      type: GraphQLNonNull(GraphQLFloat),
      description: "The timestamp of the existing document",
    },
    signature: {
      type: GraphQLNonNull(GraphQLString),
      description: "The signature of the existing document",
    },
    deleteAfter: {
      type: GraphQLFloat,
      description:
        "An optional timestamp indicating when this document should be deleted",
    },
  },
});
