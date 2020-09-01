# Changelog

## 5.1.0

### Features

- Added a `syncMany` mutation that lets you sync many workspaces with many pubs in a single operation.

## 5.0.0

### Breaking

- The `format` arg on the `syncWithPub` mutation has been removed, as whether a pub is a GraphQL or REST pub is now automatically determined.

### Features

- Added a `isGraphQlPub` function export which can be used to determine whether the pub at a URL is a GraphQL pub or not.
- Added a optional `deletedAfter` arg to the `set` mutation so that ephemeral documents can be created
- If the workspace passed to a `syncWithPub` mutation does not exist, `syncWithPub` will create it if it passes the configurable `canAddWorkspace` check.

### Internal

- earthstar dependency updated to 5.2.3
- earthstar moved into peer dependencies, as clients which may also depend on the earthstar package should use the same version.

## 4.2.0

### Improvements

- Added a `displayName` field to the `Author` type, which returns the display name set by the author at a particular path in a workspace (see https://github.com/earthstar-project/earthstar/blob/master/docs/vocabulary.md#author)

## 4.1.1

### Fixes

- Fixed an issue where deleted documents would not be synced during push or pull.

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
