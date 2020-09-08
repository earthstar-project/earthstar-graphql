import { GraphQLObjectType } from "graphql";
import { setField } from "./set";
import { Context } from "../../types";
import { addWorkspaceField } from "./addWorkspace";
import { removeWorkspaceField } from "./removeWorkspace";
import { syncWithPubField } from "./syncWithPub";
import { ingestDocumentsField } from "./ingestDocuments";
import { syncManyField } from "./syncMany";

export const mutationType = new GraphQLObjectType<{}, Context>({
  name: "Mutation",
  description: "The root mutation type",
  fields: () => ({
    set: setField,
    addWorkspace: addWorkspaceField,
    removeWorkspace: removeWorkspaceField,
    syncWithPub: syncWithPubField,
    syncMany: syncManyField,
    ingestDocuments: ingestDocumentsField,
  }),
});
