import { schema } from 'nexus'
import { StorageSqlite, syncLocalAndHttp } from 'earthstar'
import { VALIDATORS, globalCtx } from './graphql'
import path from 'path'

export type SyncResult = boolean

schema.objectType({
  name: 'SyncResult',
  description:
    'The result of a sync operation. Currently not very descriptive, need to figure out how to get richer result data from this operation...',
  definition(t) {
    t.field('syncedWorkspace', {
      nullable: true,
      type: 'Workspace',
    })
  },
})

schema.unionType({
  name: 'SetResult',
  description:
    "A possible result following an attempt to set data to a workspace's path",
  definition(t) {
    t.members(
      'SetDataSuccessResult',
      'DocumentRejectedError',
      'WorkspaceNotFoundError',
    )
    t.resolveType((item) => item.type)
  },
})

schema.objectType({
  name: 'DocumentRejectedError',
  description:
    'A result indicating that the document was rejected from being set to the workspace, e.g. because it was signed improperly. The reason will always be unknown, until I can work out how to get richer data!',
  definition(t) {
    t.string('reason')
  },
})

schema.objectType({
  name: 'SetDataSuccessResult',
  description:
    'A result indicating the document was successfully set to the workspace',
  definition(t) {
    t.field('document', {
      type: 'Document',
    })
  },
})

schema.objectType({
  name: 'WorkspaceNotFoundError',
  description:
    'A result indicating that the provided workspace is not yet synced on this GraphQL server',
  definition(t) {
    t.string('address')
  },
})

export const DocumentInput = schema.inputObjectType({
  name: 'DocumentInput',
  description: 'An input for describing a new document',
  definition(t) {
    t.field('format', {
      type: 'DocumentFormat',
      description: 'The format for new document to follow',
      required: false,
    })
    t.string('value', {
      description: 'The value of the new document, e.g. "I love honey!',
      required: true,
    })
    t.string('path', {
      description: 'The path of the document, e.g. /spices/pepper',
      required: true,
    })
  },
})

export const AuthorInput = schema.inputObjectType({
  name: 'AuthorInput',
  description: 'An input for signing documents by a specific author',
  definition(t) {
    t.string('address', {
      description:
        'The full address of the author, e.g. @suzy.6efJ8v8rtwoBxfN5MKeTF2Qqyf6zBmwmv8oAbendBZHP',
      required: true,
    })
    t.string('secret', {
      description: "The author's secret key, used for signing",
      required: true,
    })
  },
})

schema.mutationType({
  definition(t) {
    t.field('setDataToWorkspace', {
      description: "Set a value to a workspace's path",
      type: 'SetResult',
      args: {
        author: schema.arg({
          type: 'AuthorInput',
          required: true,
        }),
        document: schema.arg({
          type: 'DocumentInput',
          required: true,
        }),
        workspace: schema.stringArg({
          description:
            'The workspace address to set the data to, e.g. +cooking.123456',
          required: true,
        }),
      },
      resolve(root, args, ctx) {
        // first get the workspace to post to

        const ws = ctx.workspaces.find((ws) => {
          return ws.workspace === args.workspace
        })

        if (ws === undefined) {
          return {
            type: 'WorkspaceNotFoundError',
            address: args.workspace,
          }
        }

        const wasSuccessful = ws.set(args.author, {
          format: args.document.format || 'es.3',
          value: args.document.value,
          path: args.document.path,
        })

        if (wasSuccessful) {
          return {
            type: 'SetDataSuccessResult',
            document: ctx.workspaces
              .find((ws) => ws.workspace === args.workspace)
              ?.getDocument(args.document.path),
          }
        }

        return {
          type: 'DocumentRejectedError',
          reason: 'Unknown!',
        }
      },
    })
    t.field('syncWithPub', {
      type: 'SyncResult',
      description:
        "Sync one of the GraphQL server's locally stored workspaces with a pub's",
      args: {
        workspace: schema.stringArg({
          description:
            'The address of the workspace to sync, e.g. +camping.98765',
          required: true,
        }),
        pubUrl: schema.stringArg({
          description: 'The URL of the pub to sync with',
          required: true,
        }),
      },
      async resolve(_root, args, ctx) {
        // look for workspace, create if not already present
        const existingStorage = ctx.workspaces.find(
          (wsStorage) => wsStorage.workspace === args.workspace,
        )

        const storage =
          existingStorage ??
          new StorageSqlite({
            mode: 'create-or-open',
            validators: VALIDATORS,
            filename: path.resolve(`./workspaces/${args.workspace}.sqlite`),
            workspace: args.workspace,
          })

        const result = await syncLocalAndHttp(storage, args.pubUrl)

        if (!existingStorage) {
          globalCtx.workspaces.push(storage)
        }

        return { syncedWorkspace: storage }
      },
    })
  },
})
