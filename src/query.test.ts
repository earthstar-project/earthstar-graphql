import query from "./query";
import createSchemaContext from "./create-schema-context";
import { generateAuthorKeypair, sign, verify, AuthorKeypair } from "earthstar";
import { DeletedDocumentsQuery } from "./__generated__/deleted-documents-query";
import { LongNameQuery } from "./__generated__/long-name-query";
import { TestMutation } from "./__generated__/test-mutation";

export const TEST_WORKSPACE_ADDR = "+test.a123";

describe("query", () => {
  test("Successfully queries a new context", async () => {
    const ctx = createSchemaContext("MEMORY", {
      workspaceAddresses: [TEST_WORKSPACE_ADDR],
    });

    const TEST_QUERY = /* GraphQL */ `
      query TestQuery {
        workspaces {
          address
          name
        }
      }
    `;

    const result = await query(TEST_QUERY, {}, ctx);

    expect(result).toEqual({
      data: {
        workspaces: [{ address: TEST_WORKSPACE_ADDR, name: "test" }],
      },
    });
  });

  test("Can modify a context's data with a mutation query", async () => {
    const ctx = createSchemaContext("MEMORY", {
      workspaceAddresses: [TEST_WORKSPACE_ADDR],
    });

    const DELETE_AFTER = Date.now() * 1000 + 10000000;

    const variables = {
      author: generateAuthorKeypair("test"),
      document: {
        path: "/!testing",
        content: "is fun!",
        deleteAfter: DELETE_AFTER,
      },
      workspace: TEST_WORKSPACE_ADDR,
    };

    const TEST_MUTATION = /* GraphQL */ `
      mutation TestMutation(
        $author: AuthorInput!
        $document: NewDocumentInput!
        $workspace: String!
      ) {
        set(author: $author, document: $document, workspace: $workspace) {
          __typename
          ... on DocumentRejectedError {
            errorName
            reason
          }
          ... on SetDataSuccessResult {
            document {
              ... on ES4Document {
                content
                path
                deleteAfter
              }
            }
          }
        }
      }
    `;

    await query<TestMutation>(TEST_MUTATION, variables, ctx);

    expect(ctx.workspaces[0].getDocument("/!testing")?.content).toEqual(
      "is fun!"
    );
  });

  test("Obscures workspaces, pubs and authors when isPub is true", async () => {
    const ctx = createSchemaContext("MEMORY", {
      workspaceAddresses: [TEST_WORKSPACE_ADDR],
      isPub: true,
    });

    const DELETE_AFTER = Date.now() * 1000 + 10000000;

    const variables = {
      author: generateAuthorKeypair("test"),
      document: {
        path: "/!testing",
        content: "is fun!",
        deleteAfter: DELETE_AFTER,
      },
      workspace: TEST_WORKSPACE_ADDR,
    };

    const TEST_MUTATION = /* GraphQL */ `
      mutation TestMutation(
        $author: AuthorInput!
        $document: NewDocumentInput!
        $workspace: String!
      ) {
        set(author: $author, document: $document, workspace: $workspace) {
          __typename
          ... on DocumentRejectedError {
            errorName
            reason
          }
          ... on SetDataSuccessResult {
            document {
              ... on ES4Document {
                content
                path
                deleteAfter
              }
            }
          }
        }
      }
    `;

    await query<TestMutation>(TEST_MUTATION, variables, ctx);

    const TEST_QUERY = /* GraphQL */ `
      query TestQuery {
        workspaces {
          address
        }
        documents {
          __typename
        }
        authors {
          address
        }
      }
    `;

    const result = await query(TEST_QUERY, {}, ctx);

    expect(result).toEqual({
      data: {
        workspaces: [],
        authors: [],
        documents: [],
      },
    });
  });

  test("Can add a workspace with a mutation query", async () => {
    const ctx = createSchemaContext("MEMORY", {
      workspaceAddresses: [TEST_WORKSPACE_ADDR],
    });

    const NEW_WORKSPACE_ADDR = "+newspace.a123";

    const variables = {
      workspaceAddress: NEW_WORKSPACE_ADDR,
      author: null,
    };

    const ADD_MUTATION = /* GraphQL */ `
      mutation AddMutation($workspaceAddress: String!, $author: AuthorInput) {
        addWorkspace(workspaceAddress: $workspaceAddress, author: $author) {
          __typename
          ... on WorkspaceAddedResult {
            workspace {
              name
            }
          }
        }
      }
    `;

    await query(ADD_MUTATION, variables, ctx);

    expect(
      ctx.workspaces.find((ws) => ws.workspace === NEW_WORKSPACE_ADDR)
    ).toBeDefined();

    const permittedKeypair = generateAuthorKeypair("test") as AuthorKeypair;
    const PERMITTED_WORKSPACE_ADDR = "+allowed.a123";
    const message = sign(permittedKeypair, "canAddWorkspace") as string;

    const restrictedCtx = createSchemaContext("MEMORY", {
      workspaceAddresses: [],
      canAddWorkspace: (address, keypair) => {
        if (
          address === PERMITTED_WORKSPACE_ADDR &&
          keypair &&
          verify(keypair.address, message, "canAddWorkspace")
        ) {
          return true;
        }

        return false;
      },
    });

    const badAuthorVars = {
      workspaceAddress: PERMITTED_WORKSPACE_ADDR,
      author: generateAuthorKeypair("nope"),
    };
    const validVars = {
      workspaceAddress: PERMITTED_WORKSPACE_ADDR,
      author: permittedKeypair,
    };

    const notPermittedRes = await query(
      ADD_MUTATION,
      badAuthorVars,
      restrictedCtx
    );

    expect(notPermittedRes.data?.addWorkspace.__typename).toEqual(
      "NotPermittedResult"
    );

    await query(ADD_MUTATION, validVars, restrictedCtx);

    expect(
      restrictedCtx.workspaces.find(
        (ws) => ws.workspace === PERMITTED_WORKSPACE_ADDR
      )
    ).toBeDefined();
  });
});

test("Can remove a workspace with a mutation query", async () => {
  const ctx = createSchemaContext("MEMORY", {
    workspaceAddresses: [TEST_WORKSPACE_ADDR],
  });

  const variables = {
    workspaceAddress: TEST_WORKSPACE_ADDR,
    author: null,
  };

  const REMOVE_MUTATION = /* GraphQL */ `
    mutation RemoveMutation($workspaceAddress: String!, $author: AuthorInput) {
      removeWorkspace(workspaceAddress: $workspaceAddress, author: $author) {
        __typename
        ... on WorkspaceRemovedResult {
          address
        }
      }
    }
  `;

  await query(REMOVE_MUTATION, variables, ctx);

  expect(ctx.workspaces.length).toBe(0);

  const permittedKeypair = generateAuthorKeypair("test") as AuthorKeypair;
  const PERMITTED_WORKSPACE_ADDR = "+protected.a123";
  const message = sign(permittedKeypair, "canRemoveWorkspace") as string;

  const restrictedCtx = createSchemaContext("MEMORY", {
    workspaceAddresses: [PERMITTED_WORKSPACE_ADDR],
    canRemoveWorkspace: (address, keypair) => {
      if (
        address === PERMITTED_WORKSPACE_ADDR &&
        keypair &&
        verify(keypair.address, message, "canRemoveWorkspace")
      ) {
        return true;
      }

      return false;
    },
  });

  const badAuthorVars = {
    workspaceAddress: PERMITTED_WORKSPACE_ADDR,
    author: generateAuthorKeypair("nope"),
  };
  const validVars = {
    workspaceAddress: PERMITTED_WORKSPACE_ADDR,
    author: permittedKeypair,
  };

  const notPermittedRes = await query(
    REMOVE_MUTATION,
    badAuthorVars,
    restrictedCtx
  );
  expect(notPermittedRes.data?.removeWorkspace.__typename).toEqual(
    "NotPermittedResult"
  );

  await query(REMOVE_MUTATION, validVars, restrictedCtx);

  expect(restrictedCtx.workspaces.length).toBe(0);
});

test("Does not include deleted documents by default", async () => {
  const ctx = createSchemaContext("MEMORY", {
    workspaceAddresses: [TEST_WORKSPACE_ADDR],
  });

  const variables = {
    author: generateAuthorKeypair("test"),
    document: { path: "/deleted", content: "" },
    workspace: TEST_WORKSPACE_ADDR,
  };

  const TEST_MUTATION = /* GraphQL */ `
    mutation TestMutation(
      $author: AuthorInput!
      $document: NewDocumentInput!
      $workspace: String!
    ) {
      set(author: $author, document: $document, workspace: $workspace) {
        __typename
      }
    }
  `;

  await query(TEST_MUTATION, variables, ctx);

  const TEST_QUERY = /* GraphQL */ `
    query DeletedDocumentsQuery($includeDeleted: Boolean!) {
      documents(includeDeleted: $includeDeleted) {
        __typename
      }
      workspaces {
        documents(includeDeleted: $includeDeleted) {
          __typename
        }
      }
      authors {
        documents(includeDeleted: $includeDeleted) {
          __typename
        }
      }
    }
  `;

  const res = await query<DeletedDocumentsQuery>(
    TEST_QUERY,
    { includeDeleted: false },
    ctx
  );

  const includingDeletedRes = await query<DeletedDocumentsQuery>(
    TEST_QUERY,
    { includeDeleted: true },
    ctx
  );

  expect(res.data?.documents.length).toEqual(0);
  expect(res.data?.workspaces[0].documents.length).toEqual(0);
  expect(res.data?.authors[0].documents.length).toEqual(0);
  expect(includingDeletedRes.data?.documents.length).toEqual(1);
  expect(includingDeletedRes.data?.workspaces[0].documents.length).toEqual(1);
  expect(includingDeletedRes.data?.authors[0].documents.length).toEqual(1);
});

test("returns user long names", async () => {
  const ctx = createSchemaContext("MEMORY", {
    workspaceAddresses: ["+names.a1", "+nonames.a1"],
  });

  const TEST_AUTHOR = generateAuthorKeypair("test") as AuthorKeypair;

  ctx.workspaces
    .find((ws) => ws.workspace === "+names.a1")
    ?.set(TEST_AUTHOR, {
      content: "the spontaneous one",
      path: `/about/~${TEST_AUTHOR.address}/displayName.txt`,
      format: "es.4",
    });

  ctx.workspaces
    .find((ws) => ws.workspace === "+nonames.a1")
    ?.set(TEST_AUTHOR, {
      content: "whatever",
      path: "/test",
      format: "es.4",
    });

  const NAMES_QUERY = /* GraphQL */ `
    query LongNameQuery {
      authors {
        displayName
      }
      workspaces {
        address
        authors {
          displayName
        }
      }
    }
  `;

  const res = await query<LongNameQuery>(NAMES_QUERY, {}, ctx);

  expect(res.data?.authors[0].displayName).toBeNull();
  expect(
    res.data?.workspaces.find((ws) => ws.address === "+names.a1")?.authors[0]
      .displayName
  ).toBe("the spontaneous one");
  expect(
    res.data?.workspaces.find((ws) => ws.address === "+nonames.a1")?.authors[0]
      .displayName
  ).toBeNull();
});
