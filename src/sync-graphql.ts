import { IStorage, Document } from "earthstar";
import fetch from "cross-fetch";
import { ExecutionResult } from "graphql";

export const SYNC_QUERY = `query SyncQuery(
    $workspaceAddress: String!, 
    $versionsByAuthor: String,
    $pathPrefix: String
) {
    workspace(address: $workspaceAddress) {
      documents(versionsByAuthor: $versionsByAuthor, pathPrefix: $pathPrefix) {
        ... on ES3Document {
          value,
          timestamp,
          signature,
          path,
          format
          author {
            address
          }
          workspace {
            address
          }
        }
      }
    }
  }`;

type SyncQuery = {
  workspace: {
    documents: {
      value: string;
      timestamp: number;
      signature: string;
      path: string;
      format: string;
      author: {
        address: string;
      };
      workspace: {
        address: string;
      };
    }[];
  };
};

type SyncFilters = {
  pathPrefix?: string;
  versionsByAuthor?: string;
};

export default async function syncGraphql(
  storage: IStorage,
  graphqlUrl: string,
  filters: SyncFilters = {}
) {
  const res = await fetch(graphqlUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: SYNC_QUERY,
      variables: {
        workspaceAddress: storage.workspace,
        ...filters,
      },
    }),
  });

  const graphqlResponse: ExecutionResult<SyncQuery> = await res.json();

  if (graphqlResponse.data) {
    const documents: Document[] = graphqlResponse.data.workspace.documents.map(
      ({ author, workspace, ...rest }) => ({
        ...rest,
        author: author.address,
        workspace: workspace.address,
      })
    );

    documents.forEach((doc) => {
      storage.ingestDocument(doc);
    });
  }

  if (graphqlResponse.errors) {
    console.error(graphqlResponse.errors);
  }
}
