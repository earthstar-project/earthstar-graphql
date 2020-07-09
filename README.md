# earthstar-graphql

A GraphQL server which is able to query, sync and set data to earthstar workspaces. **This is _so_ a work in progress!!!**

## Running

Clone the repo, install deps, and run `yarn dev`. This will spin up a local instance of the GraphQL server with a playground that you can access from localhost:4000.

When the server starts up, it looks for sqlite files in the `workspaces` directory to initialise its own store of workspaces with. It will automatically create sqlite files here when you sync new workspaces with pubs

The schema is thoroughly documented, so check out the docs in the playground!

## To improve

- I'd like the response of the `syncWithPub` mutation in particular to be richer, but I think this may require changes from the earthstar package, which currently only surfaces errors like a pub 404 as log messages.
- The `setDataToWorkspace` mutation response could also be richer.

## To figure out...

- Currently workspaces are all SqliteStorage instances. Should there be an option to have this server to run with memory storage instances?
- Is there a SQLite of graph databases out there that we could use to solve some of the typing edge cases and performance issues this would undoubtedly have with larger workspaces?
- How is this thing distributed? How would we be able to embed this locally into a client? Could it be a kind of queriable pub?
