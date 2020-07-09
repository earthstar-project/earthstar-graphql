import { schema } from 'nexus'
import { StorageSqlite, ValidatorEs3, IStorage } from 'earthstar'
import path from 'path'
import fs from 'fs'
import { decodeFromId } from './interfaces/node'
import {
  getAuthor,
  getWorkspace,
  getDocument,
  getAllAuthors,
  getAllDocuments,
  sortWorkspaces,
  sortDocuments,
  sortAuthors,
} from './util'

export const VALIDATORS = [ValidatorEs3]

const workspacesDir = path.resolve('./workspaces/')
const sqliteRegex = /.*\/?(\+.*\.*)\.sqlite/
const workspaceAddresses = fs
  .readdirSync(workspacesDir)
  .filter((fileName) => fileName.match(sqliteRegex))
  .map((fileName) => {
    const result = sqliteRegex.exec(fileName)

    if (result) {
      return result[1]
    }

    return 'something-went-wrong'
  })

function getWorkspaces(addresses: string[]): IStorage[] {
  return addresses.map((address) => {
    return new StorageSqlite({
      mode: 'create-or-open',
      validators: VALIDATORS,
      filename: path.resolve(`./workspaces/${address}.sqlite`),
      workspace: address,
    })
  })
}

export var globalCtx = {
  workspaces: getWorkspaces(workspaceAddresses),
}

schema.addToContext((req) => {
  return globalCtx
})

schema.queryType({
  definition(t) {
    t.field('node', {
      type: 'Node',
      args: {
        id: schema.idArg({ required: true }),
      },
      resolve(_root, args, ctx) {
        const { typename, localId } = decodeFromId(args.id)

        switch (typename) {
          case 'Author':
            return getAuthor(localId, ctx)
          case 'Workspace':
            return getWorkspace(localId, ctx)
          case 'ES3Document':
            return getDocument(localId, ctx)
          default:
            return null
        }
      },
    })
    t.field('workspace', {
      type: 'Workspace',
      args: {
        address: schema.arg({
          type: 'String',
          nullable: false,
        }),
      },
      nullable: true,
      description: 'Look up a workspace using its path, e.g. +gardening.123456',
      resolve(_root, args, ctx) {
        return getWorkspace(args.address, ctx) || null
      },
    })

    t.list.field('workspaces', {
      description: 'Return a list of locally stored workspaces',
      type: 'Workspace',
      nullable: false,
      args: {
        sortedBy: schema.arg({
          type: 'WorkspaceSortOrder',
          required: false,
        }),
      },
      resolve(_root, args, ctx) {
        return sortWorkspaces(ctx.workspaces, args.sortedBy)
      },
    })

    t.field('document', {
      type: 'Document',
      description:
        'Look up a document using its path, e.g. +gardening.123/tomato',
      nullable: true,
      args: {
        path: schema.stringArg({ required: true }),
      },
      resolve(_root, args, ctx) {
        return getDocument(args.path, ctx)
      },
    })

    t.list.field('documents', {
      type: 'Document',
      description:
        'Return a list of all documents from all locally stored workspaces',
      nullable: false,
      args: {
        sortedBy: schema.arg({
          type: 'DocumentSortOrder',
          required: false,
        }),
      },
      resolve(_root, args, ctx) {
        const docs = getAllDocuments(ctx)

        return sortDocuments(docs, args.sortedBy)
      },
    })

    t.field('author', {
      type: 'Author',
      description:
        'Look up an author by address, e.g. @suzy.6efJ8v8rtwoBxfN5MKeTF2Qqyf6zBmwmv8oAbendBZHP',
      nullable: true,
      args: {
        address: schema.stringArg({
          required: true,
        }),
      },
      resolve(_root, args, ctx) {
        return getAuthor(args.address, ctx)
      },
    })

    t.list.field('authors', {
      type: 'Author',
      description:
        'Return a list of all authors from all locally stored workspaces',
      nullable: false,
      args: {
        sortedBy: schema.arg({
          type: 'AuthorSortOrder',
          required: false,
        }),
      },
      resolve(_root, args, ctx) {
        const authors = getAllAuthors(ctx)

        return sortAuthors(authors, ctx, args.sortedBy)
      },
    })
  },
})
