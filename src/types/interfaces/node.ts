import { interfaceType } from "@nexus/schema";
import { encode, decode } from "js-base64";
import { Document } from "earthstar";
import { ESAuthor, ESWorkspace } from "../../typeDefs";

export function encodeToId(typename: string, localId: string): string {
  return encode(`${typename}~${localId}`);
}

export function decodeFromId(
  id: string
): {
  typename: string;
  localId: string;
} {
  const decoded = decode(id);
  const [typename, localId] = decoded.split("~");

  return { typename, localId };
}

type ImplementsNode = ESAuthor | Document | ESWorkspace;

function nodeIsAuthor(node: ImplementsNode): node is ESAuthor {
  if ((node as ESAuthor).address && Object.keys(node as ESAuthor).length < 3) {
    return true;
  }

  return false;
}

function nodeIsDocument(node: ImplementsNode): node is Document {
  if ((node as Document).value) {
    return true;
  }

  return false;
}

function nodeIsWorkspace(node: ImplementsNode): node is ESWorkspace {
  if ((node as ESWorkspace).documents !== undefined) {
    return true;
  }

  return false;
}

export const NodeInterface = interfaceType({
  name: "Node",
  description: "An object with an ID",
  definition(t) {
    t.id("id", {
      description:
        "An opaque, globally unique identifier, useful for GraphQL clients which use this to automatically manage their client-side caches",
      resolve(node) {
        if (nodeIsAuthor(node)) {
          return encodeToId("Author", node.address);
        } else if (nodeIsDocument(node)) {
          return encodeToId("ES3Document", `${node.workspace}${node.path}`);
        }

        return encodeToId("Workspace", node.workspace);
      },
    });
    t.resolveType((node) => {
      if (nodeIsAuthor(node)) {
        return "Author";
      } else if (nodeIsDocument(node)) {
        return "ES3Document";
      } else if (nodeIsWorkspace(node)) {
        return "Workspace";
      }

      return null;
    });
  },
});
