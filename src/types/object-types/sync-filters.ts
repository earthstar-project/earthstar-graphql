import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLString,
} from "graphql";
import { SyncFilters, Context } from "../../types";

export const syncFiltersObject = new GraphQLObjectType<SyncFilters, Context>({
  name: "SyncFilters",
  description:
    "A description of the kinds of documents this peer is interested in",
  fields: {
    pathPrefixes: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString))),
      description:
        "Describes which paths this peer wants prefixed to documents synced to it",
      resolve(root) {
        return root.pathPrefixes;
      },
    },
    versionsByAuthor: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString))),
      description:
        "Describes which authors this peer wants to have participated in documents synced to it",
      resolve(root) {
        return root.versionsByAuthors;
      },
    },
  },
});
