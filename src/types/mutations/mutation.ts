import { GraphQLObjectType } from "graphql";
import { setField } from "./set";
import { Context } from "../../types";
import { addWorkspaceField } from "./addWorkspace";
import { syncWithPubField } from "./syncWithPub";
import { ingestDocumentsField } from "./ingestDocuments";

export const mutationType = new GraphQLObjectType<{}, Context>({
  name: "Mutation",
  description: "The root mutation type",
  fields: () => ({
    set: setField,
    addWorkspace: addWorkspaceField,
    syncWithPub: syncWithPubField,
    ingestDocuments: ingestDocumentsField,
  }),
});
