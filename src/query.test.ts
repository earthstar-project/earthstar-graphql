import query from "./query";
import createSchemaContext from "./create-schema-context";
import { generateAuthorKeypair, sign, verify } from "earthstar";

describe("query", () => {
  test("Successfully queries a new context", async () => {
    const ctx = createSchemaContext("MEMORY", {
      workspaceAddresses: ["+testing.123"],
    });

    const TEST_QUERY = `query TestQuery {
          workspaces {
              address
              name
          }
      }`;

    const result = await query(TEST_QUERY, {}, ctx);

    expect(result).toEqual({
      data: { workspaces: [{ address: "+testing.123", name: "testing" }] },
    });
  });

  test("Can modify a context's data with a mutation query", async () => {
    const ctx = createSchemaContext("MEMORY", {
      workspaceAddresses: ["+testing.123"],
    });

    const variables = {
      author: generateAuthorKeypair("test"),
      document: { path: "/testing", value: "is fun!" },
      workspace: "+testing.123",
    };

    const TEST_MUTATION = `mutation TestMutation($author: AuthorInput!, $document: DocumentInput!, $workspace: String!) {
          set(
              author: $author,
              document: $document,
              workspace: $workspace
          ) {
              ... on SetDataSuccessResult {
                  document {
                      ... on ES3Document {
                          value
                      }
                  }
              }
          }
      }`;

    await query(TEST_MUTATION, variables, ctx);

    expect(ctx.workspaces[0].getDocument("/testing")?.value).toEqual("is fun!");
  });

  test("Can add a workspace with a mutation query", async () => {
    const ctx = createSchemaContext("MEMORY", {
      workspaceAddresses: ["+testing.123"],
    });

    const newAddress = "+newspace.123";

    const variables = {
      workspaceAddress: newAddress,
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
      ctx.workspaces.find((ws) => ws.workspace === newAddress)
    ).toBeDefined();

    const permittedKeypair = generateAuthorKeypair("test");
    const message = sign(permittedKeypair, "canAddWorkspace");

    const restrictedCtx = createSchemaContext("MEMORY", {
      workspaceAddresses: [],
      canAddWorkspace: (address, keypair) => {
        if (
          address === "+allowed.999" &&
          keypair &&
          verify(keypair.address, message, "canAddWorkspace")
        ) {
          return true;
        }

        return false;
      },
    });

    const badAuthorVars = {
      workspaceAddress: "+allowed.999",
      author: generateAuthorKeypair("nope"),
    };
    const validVars = {
      workspaceAddress: "+allowed.999",
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
      restrictedCtx.workspaces.find((ws) => ws.workspace === "+allowed.999")
    ).toBeDefined();
  });
});
