import { IStorage, Document, EarthstarError } from "earthstar";
import fetch from "cross-fetch";
import { ExecutionResult } from "graphql";
import { SyncFiltersArg, IngestResult } from "./types";
import { getWorkspaceDocuments, ingestDocuments } from "./util";
import { PullQuery } from "./__generated__/pull-query";
import { IngestMutation } from "./__generated__/ingest-mutation";

export const PULL_QUERY = /* GraphQL */ `
  query PullQuery(
    $workspaceAddress: String!
    $versionsByAuthors: [String!]
    $pathPrefixes: [String!]
  ) {
    syncFilters {
      pathPrefixes
      versionsByAuthors
    }
    workspace(address: $workspaceAddress) {
      documents(
        versionsByAuthors: $versionsByAuthors
        pathPrefixes: $pathPrefixes
        includeDeleted: true
      ) {
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
  }
`;

export const INGEST_MUTATION = /* GraphQL */ `
  mutation IngestMutation($workspace: String!, $documents: [DocumentInput!]!) {
    ingestDocuments(workspace: $workspace, documents: $documents) {
      __typename
      ... on IngestDocumentsResult {
        __typename
        ... on DocumentIngestionReport {
          acceptedCount
          ignoredCount
          rejectedCount
          documents {
            __typename
            ... on RejectedDocumentIngestion {
              rejectionReason
            }
            ... on DocumentIngestion {
              document {
                ... on ES4Document {
                  ...maximalFields
                }
              }
            }
          }
        }
      }
    }
  }

  fragment maximalFields on ES4Document {
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
`;

type IngestionReport = {
  documents: {
    document: Document;
    rejectionReason?: string;
    result: IngestResult;
  }[];
  acceptedCount: number;
  ignoredCount: number;
  rejectedCount: number;
};

type SyncResult = {
  pulled: IngestionReport;
  pushed: IngestionReport;
};

export class SyncError extends EarthstarError {
  constructor(message?: string) {
    super(message || "Sync error");
    this.name = "SyncError";
  }
}

export default async function syncGraphql(
  storage: IStorage,
  graphqlUrl: string,
  filters: SyncFiltersArg
): Promise<SyncResult | SyncError> {
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

  if (pullJson.errors) {
    console.error(pullJson.errors);
  }

  if (!pullJson.data) {
    return new SyncError("Something went wrong pulling documents from the pub");
  }

  if (!pullJson.data.workspace) {
    return new SyncError("The pub didn't have the workspace requested");
  }

  const pulledDocuments: Document[] = pullJson.data.workspace.documents.map(
    ({ author, workspace, ...rest }) => ({
      ...rest,
      author: author.address,
      workspace: workspace.address,
    })
  );

  const documentsToPush = getWorkspaceDocuments(storage, {
    filters: {
      pathPrefixes: pullJson.data.syncFilters.pathPrefixes || undefined,
      versionsByAuthors:
        pullJson.data.syncFilters.versionsByAuthors || undefined,
    },
    includeDeleted: true,
  });

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

  if (ingestJson.errors) {
    console.error(ingestJson.errors);
  }

  if (!ingestJson.data) {
    return new SyncError("Something went wrong during ingestMutation");
  }

  if (
    ingestJson.data.ingestDocuments.__typename !== "DocumentIngestionReport"
  ) {
    return new SyncError(
      "Was expecting a DocumentIngestionReport, but instead got back the following type: " +
        ingestJson.data.ingestDocuments.__typename
    );
  }

  // Ingest pulled documents at the end so we don't send them back to the GraphQL pub
  const locallyIngestedReports = ingestDocuments(storage, pulledDocuments);
  const remoteIngestionResults = ingestJson.data.ingestDocuments;

  return {
    pulled: {
      documents: locallyIngestedReports,
      acceptedCount: locallyIngestedReports.filter(
        (report) => report.result === "ACCEPTED"
      ).length,
      ignoredCount: locallyIngestedReports.filter(
        (report) => report.result === "IGNORED"
      ).length,
      rejectedCount: locallyIngestedReports.filter(
        (report) => report.result === "REJECTED"
      ).length,
    },
    pushed: {
      documents: remoteIngestionResults.documents.map((doc) => ({
        document: {
          ...doc.document,
          author: doc.document.author.address,
          workspace: doc.document.workspace.address,
        },
        result:
          doc.__typename === "RejectedDocumentIngestion"
            ? "REJECTED"
            : doc.__typename === "AcceptedDocumentIngestion"
            ? "ACCEPTED"
            : "IGNORED",
        failureReason: doc.rejectionReason,
      })),
      acceptedCount: remoteIngestionResults.acceptedCount,
      ignoredCount: remoteIngestionResults.ignoredCount,
      rejectedCount: remoteIngestionResults.rejectedCount,
    },
  };
}

export async function isGraphQlPub(pubUrl: string): Promise<boolean> {
  const pullRes = await fetch(pubUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query isGqlQuery {
          __schema {
            queryType {
              name
            }
          }
        }
      `,
    }),
  });

  return pullRes.status === 200;
}
