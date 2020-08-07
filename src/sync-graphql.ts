import { IStorage, Document } from "earthstar";
import fetch from "cross-fetch";
import { ExecutionResult } from "graphql";
import { SyncFiltersArg } from "./types";
import { getWorkspaceDocuments } from "./util";
import { PullQuery } from "./__generated__/pull-query";
import { IngestMutation } from "./__generated__/ingest-mutation";

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
        ... on ES4Document {
          content
          contentHash
          deleteAfter
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

export const INGEST_MUTATION = `mutation IngestMutation($workspace: String!, $documents: [DocumentInput!]!) {
  ingestDocuments(workspace: $workspace, documents: $documents) {
    __typename
    ... on IngestDocumentsSuccess {
      workspace {
        documents {
          ... on ES4Document {
            contentHash
          }
        }
      }     
    }
  }
}`;

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

  if (pullJson.data && pullJson.data.workspace) {
    const pulledDocuments: Document[] = pullJson.data.workspace.documents.map(
      ({ author, workspace, deleteAfter, ...rest }) => ({
        ...rest,
        ...(deleteAfter ? { deleteAfter } : {}),
        author: author.address,
        workspace: workspace.address,
      })
    );

    const documentsToPush = pullJson.data
      ? getWorkspaceDocuments(storage, pullJson.data.syncFilters)
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
