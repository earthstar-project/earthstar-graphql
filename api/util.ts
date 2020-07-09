import { ESAuthor, TAuthorSortOrder } from './object-types/author'
import { Document, IStorage } from 'earthstar'
import { TWorkspaceSortOrder } from './object-types/workspace'
import { TDocumentSortOrder } from './object-types/document'

const workspaceDocPathRegex = /(\+.*\..[^\/]*)(.*)/

// Document utilities

export function getDocument(path: string, ctx: NexusContext) {
  const result = workspaceDocPathRegex.exec(path)

  if (result && result.length > 2) {
    const workspace = ctx.workspaces.find((ws) => ws.workspace === result[1])

    if (!workspace) {
      return null
    }

    return workspace.getDocument(result[2]) || null
  }

  return null
}

export function getDocumentWorkspace(doc: Document, ctx: NexusContext) {
  return ctx.workspaces.find((workspace) => {
    return workspace.workspace === doc.workspace
  })
}

export function getAllDocuments(ctx: NexusContext) {
  return ctx.workspaces.flatMap((workspace) => {
    return workspace.documents()
  })
}

export function sortDocuments(
  documents: Document[],
  sortBy: TDocumentSortOrder | null | undefined,
) {
  return [...documents].sort((aDoc, bDoc) => {
    switch (sortBy) {
      case 'NEWEST':
        return aDoc.timestamp > bDoc.timestamp ? -1 : 1
      default:
        return aDoc.timestamp < bDoc.timestamp ? -1 : 1
    }
  })
}

// Author utilities

export function getAuthor(address: string, ctx: NexusContext) {
  return getAllAuthors(ctx).find((author) => author.address === address) || null
}

const authorNameRegex = /@(.*)\./

export function getAuthorShortname(address: string): string {
  const result = authorNameRegex.exec(address)

  if (result) {
    return result[1]
  }

  return address
}

export function getAllAuthors(ctx: NexusContext) {
  return Array.from(
    new Set(
      ctx.workspaces.flatMap((workspace) => {
        return workspace.authors()
      }),
    ),
  ).map((address) => ({ address }))
}

export function getAuthorDocuments(
  author: ESAuthor,
  ctx: NexusContext,
): Document[] {
  const workspaces = author.fromWorkspace
    ? ctx.workspaces.filter((ws) => author.fromWorkspace === ws.workspace)
    : ctx.workspaces

  return workspaces.flatMap((workspace) => {
    if (!workspace.authors().includes(author.address)) {
      return []
    }

    return workspace.documents({
      versionsByAuthor: author.address,
    })
  })
}

export function getAuthorWorkspaces(authorAddress: string, ctx: NexusContext) {
  return ctx.workspaces.filter((workspace) => {
    return workspace.authors().includes(authorAddress)
  })
}

export function authorLastPublishedTimestamp(
  author: ESAuthor,
  ctx: NexusContext,
): number {
  const documents = getAuthorDocuments(author, ctx)

  documents.sort((aDoc, bDoc) => {
    return aDoc.timestamp > bDoc.timestamp ? -1 : 1
  })

  return documents.length > 0 ? documents[0].timestamp : 0
}

export function sortAuthors(
  authors: ESAuthor[],
  ctx: NexusContext,
  sortBy: TAuthorSortOrder | undefined | null,
): ESAuthor[] {
  return [...authors].sort((aAuthor, bAuthor) => {
    switch (sortBy) {
      case 'NAME_ASC':
        return aAuthor.address < bAuthor.address ? -1 : 1
      case 'NAME_DESC':
        return aAuthor.address > bAuthor.address ? -1 : 1
      case 'LAST_PUBLISHED_ASC':
        return authorLastPublishedTimestamp(aAuthor, ctx) <
          authorLastPublishedTimestamp(bAuthor, ctx)
          ? -1
          : 1
      default:
        return authorLastPublishedTimestamp(aAuthor, ctx) >
          authorLastPublishedTimestamp(bAuthor, ctx)
          ? -1
          : 1
    }
  })
}

// Workspace utilities

export function getWorkspace(address: string, ctx: NexusContext) {
  return ctx.workspaces.find((workspace) => {
    return workspace.workspace === address
  })
}

const workspaceNameRegex = /\+(.*)\./

export function getWorkspaceName(address: string) {
  const result = workspaceNameRegex.exec(address)

  if (result) {
    return result[1]
  }

  return address
}

export function getWorkspaceAuthor(workspace: IStorage, authorAddress: string) {
  const address = workspace
    .authors()
    .find((address) => authorAddress === address)

  if (address) {
    return {
      address,
      fromWorkspace: workspace.workspace,
    }
  }

  return null
}

export function getWorkspaceAuthors(workspace: IStorage) {
  return workspace
    .authors()
    .map((address) => ({ address, fromWorkspace: workspace.workspace }))
}

export function workspaceLastActivityTimestamp(workspace: IStorage): number {
  const documents = workspace.documents()

  documents.sort((aDoc, bDoc) => {
    return aDoc.timestamp > bDoc.timestamp ? -1 : 1
  })

  return documents.length > 0 ? documents[0].timestamp : 0
}

export function sortWorkspaces(
  workspaces: IStorage[],
  sortBy: TWorkspaceSortOrder | null | undefined,
): IStorage[] {
  return workspaces.sort((aWorkspace, bWorkspace) => {
    switch (sortBy) {
      case 'NAME_ASC':
        return aWorkspace.workspace < bWorkspace.workspace ? -1 : 1
      case 'NAME_DESC':
        return aWorkspace.workspace > bWorkspace.workspace ? -1 : 1
      case 'POPULATION_ASC':
        return aWorkspace.authors().length < bWorkspace.authors().length
          ? -1
          : 1
      case 'POPULATION_DESC':
        return aWorkspace.authors().length > bWorkspace.authors().length
          ? -1
          : 1
      case 'LAST_ACTIVITY_ASC':
        return workspaceLastActivityTimestamp(aWorkspace) <
          workspaceLastActivityTimestamp(bWorkspace)
          ? -1
          : 1
      default:
        return workspaceLastActivityTimestamp(aWorkspace) >
          workspaceLastActivityTimestamp(bWorkspace)
          ? -1
          : 1
    }
  })
}
