import { generateAuthorKeypair, sign, Document, ValidatorEs3 } from "earthstar";
import { createSchemaContext, query } from "..";
import { graphql } from "msw";
import { SYNC_QUERY } from "../sync-graphql";
import { setupServer } from "msw/node";

const TEST_WORKSPACE_ADDR = "+test.123";
const TEST_AUTHOR = generateAuthorKeypair("test");

const context = createSchemaContext("MEMORY", {
  workspaceAddresses: [TEST_WORKSPACE_ADDR],
});

const docs: Document[] = [
  {
    format: "es.3",
    workspace: TEST_WORKSPACE_ADDR,
    author: TEST_AUTHOR.address,
    path: "/test/1",
    value: "The first test document",
    timestamp: Date.now() * 1000 - 30000,
    signature: "",
  },
  {
    format: "es.3",
    workspace: TEST_WORKSPACE_ADDR,
    author: TEST_AUTHOR.address,
    path: "/test/2",
    value: "The second test document",
    timestamp: Date.now() * 1000 - 20000,
    signature: "",
  },
  {
    format: "es.3",
    workspace: TEST_WORKSPACE_ADDR,
    author: TEST_AUTHOR.address,
    path: "/test/3",
    value: "The third test document",
    timestamp: Date.now() * 1000 - 10000,
    signature: "",
  },
  {
    format: "es.3",
    workspace: TEST_WORKSPACE_ADDR,
    author: TEST_AUTHOR.address,
    path: "/wiki/door",
    value: "The third test document",
    timestamp: Date.now() * 1000 - 20000,
    signature: "",
  },
];

docs.forEach((doc) => {
  const signedDoc = ValidatorEs3.signDocument(TEST_AUTHOR, doc);
  context.workspaces[0].ingestDocument(signedDoc);
});

const handlers = [
  graphql.query("SyncQuery", async (req, res, ctx) => {
    const { data } = await query(SYNC_QUERY, req.variables, context);

    return res(ctx.data({ ...data }));
  }),
];

export default setupServer(...handlers);
