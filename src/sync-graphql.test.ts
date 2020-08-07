import createMockServer from "./mocks/create-mock-server";
import {
  StorageMemory,
  ValidatorEs4,
  generateAuthorKeypair,
  sign,
  Document,
  AuthorKeypair,
} from "earthstar";
import syncGraphql from "./sync-graphql";
import { createSchemaContext } from ".";
import { Context } from "./types";

export const TEST_WORKSPACE_ADDR = "+test.a123";
export const TEST_AUTHOR = generateAuthorKeypair("test") as AuthorKeypair;

function setupTestServerContext(): Context {
  const testServerContext = createSchemaContext("MEMORY", {
    workspaceAddresses: [TEST_WORKSPACE_ADDR],
    syncFilters: {
      versionsByAuthors: [TEST_AUTHOR.address],
      pathPrefixes: ["/test"],
    },
  });

  const docs = [
    {
      format: "es.4",
      workspace: TEST_WORKSPACE_ADDR,
      author: TEST_AUTHOR.address,
      path: "/test/1",
      content: "The first test document",
      timestamp: Date.now() * 1000 - 30000,
      signature: "",
    },
    {
      format: "es.4",
      workspace: TEST_WORKSPACE_ADDR,
      author: TEST_AUTHOR.address,
      path: "/test/2",
      content: "The second test document",
      timestamp: Date.now() * 1000 - 20000,
      signature: "",
    },
    {
      format: "es.4",
      workspace: TEST_WORKSPACE_ADDR,
      author: TEST_AUTHOR.address,
      path: "/test/3",
      content: "The third test document",
      timestamp: Date.now() * 1000 - 10000,
      signature: "",
    },
    {
      format: "es.4",
      workspace: TEST_WORKSPACE_ADDR,
      author: TEST_AUTHOR.address,
      path: "/wiki/door",
      content: "The third test document",
      timestamp: Date.now() * 1000 - 20000,
      signature: "",
    },
  ];

  docs.forEach((doc) => {
    testServerContext.workspaces[0].set(TEST_AUTHOR, doc);
  });

  return testServerContext;
}

var testServerContext = setupTestServerContext();
var server = createMockServer(testServerContext);

beforeAll(() => {
  server.listen();
});

beforeEach(() => {
  server = createMockServer(testServerContext);
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
  testServerContext = setupTestServerContext();
});

afterAll(() => {
  server.close();
});

test("Syncs", async () => {
  const storage = new StorageMemory([ValidatorEs4], TEST_WORKSPACE_ADDR);
  const author = generateAuthorKeypair("test") as AuthorKeypair;

  const doc = {
    format: "es.4",
    workspace: TEST_WORKSPACE_ADDR,
    author: author.address,
    path: "/test/4",
    content: "A local document",
    timestamp: Date.now() * 1000,
    signature: sign(author, "A local document"),
  };

  storage.set(author, doc);

  await syncGraphql(storage, "https://test.server/graphql", {});

  expect(storage.documents().length).toBe(5);
  expect(storage.documents().map((doc) => doc.path)).toEqual([
    "/test/1",
    "/test/2",
    "/test/3",
    "/test/4",
    "/wiki/door",
  ]);
  expect(storage.documents({ path: "/test/4" })[0].content).toEqual(
    "A local document"
  );
  expect(storage.documents({ path: "/test/4" })[0].author).toEqual(
    author.address
  );
});

test("Filter Syncs", async () => {
  const storage = new StorageMemory([ValidatorEs4], "+test.a123");
  const author = generateAuthorKeypair("test") as AuthorKeypair;

  [
    {
      format: "es.4",
      workspace: TEST_WORKSPACE_ADDR,
      author: author,
      path: "/test/4",
      content: "A local document",
      timestamp: Date.now() * 1000,
      signature: sign(author, "A local document"),
    },
    {
      format: "es.4",
      workspace: TEST_WORKSPACE_ADDR,
      author: author,
      path: "/memes",
      content: "...",
      timestamp: Date.now() * 1000,
      signature: sign(author, "..."),
    },
    {
      format: "es.4",
      workspace: TEST_WORKSPACE_ADDR,
      author: TEST_AUTHOR,
      path: "/stuff",
      content: "final_final_draft_v2.psd",
      timestamp: Date.now() * 1000,
      signature: sign(author, "final_final_draft_v2.psd"),
    },
  ]
    .map(({ author, ...rest }) => {
      return {
        author,
        doc: rest,
      };
    })
    .forEach(({ author, doc }) => {
      storage.set(author, doc);
    });

  await syncGraphql(storage, "https://test.server/graphql", {
    pathPrefixes: ["/wiki"],
  });

  expect(storage.documents().length).toBe(4);

  const docPaths = storage.documents().map((doc) => doc.path);

  expect(docPaths).toEqual(["/memes", "/stuff", "/test/4", "/wiki/door"]);

  const pubDocPaths = testServerContext.workspaces[0].documents().map((doc) => {
    return doc.path;
  });

  expect(pubDocPaths).toEqual([
    "/stuff",
    "/test/1",
    "/test/2",
    "/test/3",
    "/test/4",
    "/wiki/door",
  ]);
});
