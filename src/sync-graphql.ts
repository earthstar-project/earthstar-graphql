import { IStorage, Document } from "earthstar";
import fetch from "cross-fetch";
import { ExecutionResult } from "graphql";
import { SyncFilters, SyncFiltersArg } from "./types";
import { graphql } from "msw/lib/types";

export const PULL_QUERY = `query PullQuery(
    $workspaceAddress: String!, 
    $versionsByAuthors: [String!],
    $pathPrefixes: [String!]
) {
    syncFilters {
      pathPrefixes
      versionsByAuthors
    }
    workspace(address: $workspaceAddress) {
      documents(versionsByAuthors: $versionsByAuthors, pathPrefixes: $pathPrefixes) {
        ... on ES3Document {
          value
          timestamp
          signature
          path
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

type PullQuery = {
  syncFilters: {
    pathPrefixes: string[];
    versionsByAuthors: string[];
  };
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

export const INGEST_MUTATION = `mutation IngestMutation($workspace: String!, $documents: [DocumentInput!]!) {
  ingestDocuments(workspace: $workspace, documents: $documents) {
    __typename
    ... on IngestDocumentsSuccess {
      workspace {
        documents {
          ... on ES3Document {
            path
            value
          }
        }
      }     
    }
  }
}`;

type IngestMutation = {
  ingestDocuments:
    | {
        __typename: "IngestDocumentsSuccess";
        workspace: {
          document: {
            path: string;
            value: string;
          };
        };
      }
    | {
        __typename: "WorkspaceNotFoundError";
      };
};

function assembleDocumentsToPush(
  storage: IStorage,
  filters: SyncFilters
): Document[] {
  const byAuthorDocuments = filters.versionsByAuthors.flatMap((author) => {
    return storage.documents({ versionsByAuthor: author });
  });

  const prefixPathDocuments = filters.pathPrefixes.flatMap((pathPrefix) => {
    return storage.documents({ pathPrefix });
  });

  return [...byAuthorDocuments, ...prefixPathDocuments];
}

export default async function syncGraphql(
  storage: IStorage,
  graphqlUrl: string,
  filters: SyncFiltersArg
) {
  const pullRes = await fetch(graphqlUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: PULL_QUERY,
      variables: {
        workspaceAddress: storage.workspace,
        ...filters,
      },
    }),
  });

  const pullJson: ExecutionResult<PullQuery> = await pullRes.json();

  if (pullJson.data) {
    const pulledDocuments: Document[] = pullJson.data.workspace.documents.map(
      ({ author, workspace, ...rest }) => ({
        ...rest,
        author: author.address,
        workspace: workspace.address,
      })
    );

    const documentsToPush = pullJson.data
      ? assembleDocumentsToPush(storage, pullJson.data.syncFilters)
      : storage.documents();

    const ingestRes = await fetch(graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: INGEST_MUTATION,
        variables: {
          workspace: storage.workspace,
          documents: documentsToPush,
        },
      }),
    });

    const ingestJson: ExecutionResult<IngestMutation> = await ingestRes.json();

    if (ingestJson.data) {
      if (
        ingestJson.data.ingestDocuments.__typename !== "IngestDocumentsSuccess"
      ) {
        console.error("Uh-oh!");
      }
    }

    if (ingestJson.errors) {
      console.error(ingestJson.errors);
    }

    // Ingest pulled documents at the end so we don't send them back to the GraphQL pub
    pulledDocuments.forEach((doc) => {
      storage.ingestDocument(doc);
    });
  }

  if (pullJson.errors) {
    console.error(pullJson.errors);
  }
}
