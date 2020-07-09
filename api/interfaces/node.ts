import { schema } from 'nexus'
import { ESAuthor } from '../object-types/author'
import { Document } from 'earthstar'
import { ESWorkspace } from '../object-types/workspace'

export function encodeToId(typename: string, localId: string) {
  return Buffer.from(`${typename}~${localId}`).toString('base64')
}

export function decodeFromId(id: string) {
  const decoded = Buffer.from(id, 'base64').toString()
  const [typename, localId] = decoded.split('~')

  return { typename, localId }
}

type ImplementsNode = ESAuthor | Document | ESWorkspace

function nodeIsAuthor(node: ImplementsNode): node is ESAuthor {
  if (
    (node as ESAuthor).address &&
    Object.values(node as ESAuthor).length < 3
  ) {
    return true
  }

  return false
}

function nodeIsDocument(node: ImplementsNode): node is Document {
  if ((node as Document).value) {
    return true
  }

  return false
}

function nodeIsWorkspace(node: ImplementsNode): node is ESWorkspace {
  if ((node as ESWorkspace).documents !== undefined) {
    return true
  }

  return false
}

schema.interfaceType({
  name: 'Node',
  description: 'An object with an ID',
  definition(t) {
    t.id('id', {
      description:
        'An opaque, globally unique identifier, useful for GraphQL clients which use this to automatically manage their client-side caches',
    })
    t.resolveType((node) => {
      if (nodeIsAuthor(node)) {
        return 'Author'
      } else if (nodeIsDocument(node)) {
        return 'ES3Document'
      } else if (nodeIsWorkspace(node)) {
        return 'Workspace'
      }

      return null
    })
  },
})
