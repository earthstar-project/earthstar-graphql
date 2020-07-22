import query from "./query";
import { makeMemoryContext } from "./context";
import { generateAuthorKeypair } from "earthstar";

describe("query", () => {
  test("Successfully queries a new context", async () => {
    var ctx = makeMemoryContext(["+testing.123"]);

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
    var ctx = makeMemoryContext(["+testing.123"]);

    const variables = {
      author: generateAuthorKeypair("test"),
      document: { path: "/testing", value: "is fun!" },
      workspace: "+testing.123",
    };

    const TEST_MUTATION = `mutation TestMutation($author: AuthorInput!, $document: DocumentInput!, $workspace: String!) {
          setDataToWorkspace(
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
});
