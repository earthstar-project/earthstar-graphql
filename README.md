# earthstar-graphql

Query, sync and set data to [earthstar](https://github.com/cinnamon-bun/earthstar) workspaces using GraphQL.

Which possibilities does a GraphQL API open up?

- Easily traverse related data in a single query
- Build earthstar clients in other languages than JavaScript
- Simplify client development with GraphQL clients that handle data caching for you

Use this package to spin up endpoints, build your own servers, or even embed the schema inside your client and query via a function. Or spin up a playground that you can use to learn more about earthstar via the generated documentation.

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

Thanks to earthstar being able to run offline and in-browser, there are many ways to build apps using earthstar-graphql. You can run a server on node, where you can persist data using SQLite and query over HTTP. Or you can embed the schema directly within a client, which makes querying as straightforward as a function call!

Whichever method you use, the GraphQL server needs on a _context_. This is where data like the workspaces and the storage method (i.e. SQLite or in-memory) is kept.

You will need to build a context first, and then provide it to either your server or the `query` function. Both support SQLite and in-memory storage.

### API

#### `makeMemoryContext`

```ts
function makeMemoryContext(workspaceAddresses: string[]): Context;
```

Creates a GraphQL context which stores data from multiple workspaces in-memory.

#### `makeSqliteContext`

```ts
function makeSqliteContext(
  workspaces: { workspaceAddress: string; path: string }[]
): Context;
```

Creates a GraphQL context which persists data for multiple workspaces in SQLite files at their respective path(s).

#### `query`

```ts
function query(
  queryString: string,
  variables: Record<string, any>,
  ctx: Context
): Promise<ExecutionResult>;
```

Returns a GraphQL response promise for a given query, variables, and context. If you want to embed the GraphQL API within your client, this is the way to do it.

#### `makeServer`

```ts
function makeServer(context: Context): Apolloserver;
```

Returns an Apollo GraphQL server for a given context.

#### `schema`

The GraphQLSchema definition If you want to do something more complicated (e.g. build your own GraphQL server).
