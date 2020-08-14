# Changelog

## Next

### Fixes

- Fixed an issue where deleted documents would not be synced during push or pull from GraphQL pubs.

## 4.1.0

### Improvements

- Added a `includeDeleted` field to all document querying fields, which returns deleted documents (which as of now is when a document's content is an empty string) when true.

## 4.0.1

### Fixes

- Fixed an issue where a schema context configured with no sync filters would wrongly respond to queries for its sync filters as empty arrays.
  - I think these two should be semantically different: an undefined sync filter means the pub has no preference on documents, whereas an empty one would mean the pub is accepting nothing. (???)

## 4.0.0

### Breaking

- The `syncWithPub` mutation now returns more results, including a more detailed result type for GraphQL sync which exposes data on all the documents that were pushed and pulled.
- `ES3Document` has been renamed to `ES4Document`
- The `value` field on `ES4Document` has been replaced by `content`
- `graphql` is now a peer dependency

### Improvements

- `DocumentRejectedError` now gives back a reason for why the document was rejected during the `set` Mutation
- `syncGraphql` now returns a detailed report of the documents pushed and pulled
- `ES4Document` now has `deleteAfter` and `contentHash` fields

### Internal

- Added a GraphQL SDL of the current schema to src/schema.graphql
- Added ts-graphql-plugin so TS can validate queries against our schema
- Added automatically generated TS types for GraphQL queries in this codebase
- Added a Github action for validating GraphQL queries in the codebase
- Refactored how mutations are organised

## v3.0.0

### Breaking

- The `make***Context` functions have been replaced by a single `createContext` function
- The `sync` mutation has been renamed to `syncWithPub`, and its return type has changed

### Improvements

- Added a `syncGraphql` export which syncs a local `IStorage` with a publicly accessible earthstar-graphql server
- Added a `ingestDocuments` mutation
- Added a `addWorkspace` mutation which uses the schema context's `canAddWorkspace` option to authorise new additions
- Added more arguments to plural documents fielding to allow filtering, e.g. documents with a certain path prefix
- Added a `syncFilters` field that indicates the kinds of documents the current context is interested in

### Docs

- Added an example usage of the `query` export

### Internal

- Added a `dev` command that starts up a GraphQL server which restarts whenever changes are made
- Added server mocking for `syncGraphql` tests

## v2.0.0

### Breaking

- Removed the `makeServer` export, given how easy it is to construct servers using the `schema` export, and given how huge (and hard to work with) the package was by including `apollo-server` as a dependency.

### Improvements

- Make `query` export able to describe type of returned data

### Bugs

- Fix a problem where synced workspaces were not properly persisted to context

### Docs

- Add note to docs that syncing and setting data are done via the GraphQL API (#3)
- Improve naming of certain arguments (#2)

### Internal

- Removed `apollo-server` as a dependency
- Removed `@nexus/schema` as a dependency, and use `graphql-js` to define the schema instead
