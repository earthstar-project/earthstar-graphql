import query from "./query";
import createSchemaContext from "./create-schema-context";
import { generateAuthorKeypair, sign, verify, AuthorKeypair } from "earthstar";

export const TEST_WORKSPACE_ADDR = "+test.a123";

describe("query", () => {
  test("Successfully queries a new context", async () => {
    const ctx = createSchemaContext("MEMORY", {
      workspaceAddresses: [TEST_WORKSPACE_ADDR],
    });

    const TEST_QUERY = `query TestQuery {
          workspaces {
              address
              name
          }
      }`;

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

    const variables = {
      author: generateAuthorKeypair("test"),
      document: { path: "/testing", content: "is fun!" },
      workspace: TEST_WORKSPACE_ADDR,
    };

    const TEST_MUTATION = `mutation TestMutation($author: AuthorInput!, $document: NewDocumentInput!, $workspace: String!) {
          set(
              author: $author,
              document: $document,
              workspace: $workspace
          ) {
              ... on SetDataSuccessResult {
                  document {
                      ... on ES4Document {
                          content
                      }
                  }
              }
          }
      }`;

    await query(TEST_MUTATION, variables, ctx);

    expect(ctx.workspaces[0].getDocument("/testing")?.content).toEqual(
      "is fun!"
    );
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

    const ADD_MUTATION = `mutation AddMutation($workspaceAddress: String!, $author: AuthorInput) {
      addWorkspace(workspaceAddress: $workspaceAddress, author: $author) {
        __typename
        ... on WorkspaceAddedResult {
          workspace {
            name
          }
        }
      }
    }`;

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
