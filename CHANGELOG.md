# Changelog

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
