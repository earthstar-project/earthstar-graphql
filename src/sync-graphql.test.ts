import server from "./mocks/server";
import {
  StorageMemory,
  ValidatorEs3,
  generateAuthorKeypair,
  sign,
} from "earthstar";
import syncGraphql from "./sync-graphql";

beforeAll(() => {
  server.listen();
});

afterEach(() => server.resetHandlers());

afterAll(() => {
  server.close();
});

test("Syncs", async () => {
  const storage = new StorageMemory([ValidatorEs3], "+test.123");
  const author = generateAuthorKeypair("test");

  const doc = {
    format: "es.3",
    workspace: "+test.123",
    author: author.address,
    path: "/test/4",
    value: "A local document",
    timestamp: Date.now() * 1000,
    signature: sign(author, "A local document"),
  };

  const signedDoc = ValidatorEs3.signDocument(author, doc);
  storage.ingestDocument(signedDoc);

  await syncGraphql(storage, "https://test.server/graphql");

  expect(storage.documents().length).toBe(5);
  expect(storage.documents().map((doc) => doc.path)).toEqual([
    "/test/1",
    "/test/2",
    "/test/3",
    "/test/4",
    "/wiki/door",
  ]);
  expect(storage.documents({ path: "/test/4" })[0].value).toEqual(
    "A local document"
  );
  expect(storage.documents({ path: "/test/4" })[0].author).toEqual(
    author.address
  );
});

test("Filter Syncs", async () => {
  const storage = new StorageMemory([ValidatorEs3], "+test.123");
  const author = generateAuthorKeypair("test");

  const doc = {
    format: "es.3",
    workspace: "+test.123",
    author: author.address,
    path: "/test/4",
    value: "A local document",
    timestamp: Date.now() * 1000,
    signature: sign(author, "A local document"),
  };

  const signedDoc = ValidatorEs3.signDocument(author, doc);
  storage.ingestDocument(signedDoc);

  await syncGraphql(storage, "https://test.server/graphql", {
    pathPrefix: "/wiki/",
  });

  expect(storage.documents().length).toBe(2);
  expect(storage.documents().map((doc) => doc.path)).toEqual([
    "/test/4",
    "/wiki/door",
  ]);
});
