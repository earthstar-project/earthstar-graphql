import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLFloat,
} from "graphql";
import { documentFormatEnum } from "../object-types/document";

export default new GraphQLInputObjectType({
  name: "NewDocumentInput",
  description: "An input for describing a new document",
  fields: {
    format: {
      type: documentFormatEnum,
      description: "The format for new document to follow",
    },
    content: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The content of the new document, e.g. "I love honey!',
    },
    path: {
      type: GraphQLNonNull(GraphQLString),
      description: "The path of the document, e.g. /spices/pepper",
    },
    deleteAfter: {
      type: GraphQLFloat,
      description:
        "A timestamp representing the time this document should be deleted by",
      defaultValue: null,
    },
  },
});
