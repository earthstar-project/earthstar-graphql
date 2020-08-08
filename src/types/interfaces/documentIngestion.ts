import { GraphQLInterfaceType, GraphQLNonNull } from "graphql";
import { documentUnionType } from "../object-types/document";

export default new GraphQLInterfaceType({
  name: "DocumentIngestion",
  description: "A report on how a document ingestion proceeded",
  fields: {
    document: {
      type: GraphQLNonNull(documentUnionType),
      description: "The document in question",
    },
  },
  resolveType(item) {
    return item.__type;
  },
});
