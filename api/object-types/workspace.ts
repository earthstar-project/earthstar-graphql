import { schema } from 'nexus'
import { IStorage } from 'earthstar'
import { encodeToId } from '../interfaces/node'
import {
  getWorkspaceName,
  getWorkspaceAuthors,
  getWorkspaceAuthor,
  sortAuthors,
  sortDocuments,
} from '../util'

export type ESWorkspace = IStorage

export type TWorkspaceSortOrder =
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'LAST_ACTIVITY_DESC'
  | 'LAST_ACTIVITY_ASC'
  | 'POPULATION_ASC'
  | 'POPULATION_DESC'

schema.enumType({
  name: 'WorkspaceSortOrder',
  rootTyping: 'TWorkspaceSortOrder',
  members: [
    {
      name: 'NAME_ASC',
      description: 'Order workspaces by their names in ascending order',
    },
    {
      name: 'NAME_DESC',
      description: 'Order workspaces by their names in descending order',
    },
    {
      name: 'LAST_ACTIVITY_ASC',
      description: 'Order workspaces by those with the most recent activity',
    },
    {
      name: 'LAST_ACTIVITY_DESC',
      description: 'Order workspaces by those with the least recent activity',
    },
    {
      name: 'POPULATION_ASC',
      description:
        'Order workspaces by those with the least number of authors first',
    },
    {
      name: 'POPULATION_DESC',
      description:
        'Order workspaces by those with the least number of authors first',
    },
  ],
  description:
    'The order in which to look up the workspaces. The default is LAST_ACTIVITY_DESC',
})

schema.objectType({
  name: 'Workspace',
  rootTyping: 'ESWorkspace',
  definition(t) {
    t.implements('Node')
    t.id('id', {
      resolve(root) {
        return encodeToId('Workspace', root.workspace)
      },
    })
    t.string('name', {
      nullable: false,
      description:
        'The name of the workspace, without the following random chars',
      resolve(root) {
        return getWorkspaceName(root.workspace)
      },
    })
    t.string('address', {
      description: 'The full address of the workspace',
      nullable: false,
      resolve(root) {
        return root.workspace
      },
    })
    t.list.field('authors', {
      type: 'Author',
      description: 'A list of authors who have published to this workspace',
      nullable: false,
      args: {
        sortedBy: schema.arg({
          type: 'AuthorSortOrder',
          required: false,
        }),
      },
      resolve(root, args, ctx) {
        const authors = getWorkspaceAuthors(root)

        return sortAuthors(authors, ctx, args.sortedBy)
      },
    })
    t.field('author', {
      type: 'Author',
      description:
        'Look up an author who has published to this workspace by their address, e.g. @suzy.6efJ8v8rtwoBxfN5MKeTF2Qqyf6zBmwmv8oAbendBZHP',
      args: {
        address: schema.stringArg({
          required: true,
        }),
      },
      nullable: true,
      resolve(root, args) {
        return getWorkspaceAuthor(root, args.address)
      },
    })
    t.field('document', {
      type: 'Document',
      description:
        'Look up a document in this workspace using its path, e.g. /games/chess',
      args: {
        path: schema.stringArg({
          required: true,
        }),
      },
      resolve(root, args) {
        return root.getDocument(args.path) || null
      },
    })
    t.list.field('documents', {
      type: 'Document',
      description: 'A list of documents published in this workspace',
      nullable: false,
      args: {
        sortedBy: schema.arg({
          type: 'DocumentSortOrder',
          required: false,
        }),
      },
      resolve(root, args) {
        return sortDocuments(root.documents(), args.sortedBy)
      },
    })
    t.int('population', {
      description: 'The number of authors who have published to this workspace',
      resolve(root) {
        return root.authors().length
      },
    })
  },
})
