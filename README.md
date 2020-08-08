# earthstar-graphql

Query, sync and set data to [earthstar](https://github.com/cinnamon-bun/earthstar) workspaces using GraphQL.

Which possibilities does a GraphQL API open up?

- Easily traverse related data in a single query
- Build earthstar clients in other languages than JavaScript
- Simplify client development with GraphQL clients that handle data caching for you

Use this package to query a schema, build servers, or spin up a playground that you can use to learn more about earthstar via the generated documentation.

## Starting the GraphQL playground

To read the generated documentation to learn what kind of queries you can make, you can start up a graphql playground.

1. Clone this repo
2. Install dependencies with `yarn`
3. Run `yarn server`
4. Navigate to localhost:4000 in your browser

## Usage

### Installation

From within your project:

```
yarn add earthstar-graphql
```

### Intro

Thanks to earthstar being able to run offline and in-browser, there are many ways to build apps using earthstar-graphql.

Usually GraphQL APIs are deployed as servers that can be queried over HTTP, but earthstar makes it possible to embed and query the schema from within the client, no HTTP requests needed!
Even then, it's still possible to build traditional GraphQL endpoints using this package.

However you decide to query the schema, you need a _context_. This is where data like the workspaces and the storage method (i.e. SQLite or in-memory) is kept.

You will need to build a context first, which you can provide to the `query` function or whatever GraphQL solution you're using.

Both adding new data to a workspace and syncing a workspace with a remote pub are triggered via the GraphQL API, with the `set` and `syncWithPub` mutations. Sending data to a workspace from another peer is done using a `ingestDocuments` mutation.

### API

#### `createSchemaContext`

```ts
function createSchemaContext(
  mode: "MEMORY" | "SQLITE",
  options: ContextOptions
): Context;
```

Creates a GraphQL context which stores data from multiple workspaces. It can store this data in-memory or using SQLite.

##### ContextOptions

- `workspaceAddresses: string[]`: A list of workspaces addresses to initialise the context with.
- `canAddWorkspace?: ( workspaceAddress: string, author?: AuthorKeypair ) => boolean`: A function that is called when someone attempts to add a new workspace, and which returns a boolean indicating whether this is authorised.
- `syncFilters?: { pathPrefixes?: string[], versionsByAuthors?: string[] }`: An object describing the kinds of documents the context wants to sync. Optional, and not all pubs respect it.
- `getWorkspacePath: (address: string) => string`: (SQLite context only): A function which returns the path where a workspace's SQLite database is stored.

#### `query`

```ts
function query(
  queryString: string,
  variables: Record<string, any>,
  ctx: Context
): Promise<ExecutionResult>;
```

An asynchronous function which returns a GraphQL response promise for a given query, variables, and context.

```ts
const QUERY = `{
  workspaces {
    address
    documents {
      ... on ES4Document {
        value
        author {
          address
        }
      }
    }
  }  
}`;

const result = query(QUERY, {}, context);
```

#### `schema`

The GraphQLSchema which you can use to create things like HTTP servers:

```js
import { makeMemoryContext, schema } from "earthstar-graphql";
import { ApolloServer } from "apollo-server";

const context = makeMemoryContext(["+bees.777"]);
const server = new ApolloServer({ schema, context });

server.listen().then(({ url }) => {
  console.log(`🍄 earthstar-graphql ready at ${url}`);
});
```

#### `syncGraphql`

```ts
function syncGraphql(
  storage: IStorage,
  graphqlUrl: string,
  filters: {
    pathPrefixes?: string[];
    versionsByAuthors?: string[];
  }
): Promise<SyncResult | SyncError>;
```

A function you can use to sync documents from a remote GraphQL server to a local `IStorage` instance. It also takes filter options, so you can selectively sync documents. The `IStorage` is mutated in place.

The sync result contains data about the documents which were pushed and pulled, and whether they were accepted, ignored or rejected.
