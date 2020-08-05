# Changelog

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
