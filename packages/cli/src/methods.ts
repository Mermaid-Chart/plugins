import type { MermaidChart } from '@mermaidchart/sdk';

import { CommanderError } from '@commander-js/extra-typings';
import {
  createUrlID,
  extractFrontMatter,
  getDocumentID,
  injectFrontMatter,
  removeFrontMatterKeys,
} from './frontmatter.js';

/**
 * Cached data to use when pulling/pushing/linking multiple files at once.
 */
export interface Cache {
  /**
   * If `true`, the user has said to use the projectId to create all documents
   * in.
   *
   * If `undefined`, ask the user if they want to use their first chosen project
   * id for every other document.
   *
   * If `false`, don't ask the user.
   */
  usePreviousSelectedProjectId?: Promise<boolean>;
  /**
   * Previously selected project ID.
   * Will be reused if {@link usePreviousSelectedProjectId} is `true`.
   */
  previousSelectedProjectId?: string;
  /**
   * Cached response from {@link MermaidChart.getProjects}.
   */
  projects?: ReturnType<MermaidChart['getProjects']>;
}

interface CommonOptions {
  /** Description of diagram to use when sending messages to the user */
  title: string;
}

/**
 * Options to pass to {@link link}.
 */
export interface LinkOptions extends CommonOptions {
  /** Function that asks the user which project id they want to upload a diagram to */
  getProjectId: (cache: LinkOptions['cache'], documentTitle: string) => Promise<string>;
  /** cache to be shared between link calls. This object may be modified between calls. */
  cache: Cache;
  /** If `true`, ignore diagrams that are already linked. */
  ignoreAlreadyLinked: boolean;
}

/**
 * Creates a new diagram on MermaidChart.com for the given local diagram.
 *
 * @returns The diagram with an added `id: xxxx` field.
 */
export async function link(
  diagram: string,
  client: MermaidChart,
  { title, getProjectId, cache, ignoreAlreadyLinked }: LinkOptions,
) {
  const frontmatter = extractFrontMatter(diagram);

  if (frontmatter.metadata.id) {
    if (ignoreAlreadyLinked) {
      console.log(`○ - ${title} is already linked`);
      return diagram; // no change required
    } else {
      throw new CommanderError(
        /*exitCode=*/ 1,
        'EALREADY_LINKED',
        'This document already has an `id` field',
      );
    }
  }

  const projectId = await getProjectId(cache, title);

  const createdDocument = await client.createDocument(projectId);

  await client.setDocument({
    projectID: createdDocument.projectID,
    documentID: createdDocument.documentID,
    title,
    code: diagram,
  });

  const diagramWithId = injectFrontMatter(diagram, {
    id: createUrlID(client.baseURL, createdDocument.documentID),
  });

  return diagramWithId;
}

interface PullOptions extends CommonOptions {}

/**
 * Pulls down a diagram from MermaidChart.com
 *
 * @param diagram - The local diagram. This should have an `id: ` field in the YAML frontmatter.
 *
 * @returns The updated diagram. This may equal `diagram` if there were no changes.
 */
export async function pull(diagram: string, client: MermaidChart, { title }: PullOptions) {
  const frontmatter = extractFrontMatter(diagram);

  if (frontmatter.metadata.id === undefined) {
    throw new Error(`Diagram at ${title} has no id, have you run \`link\` yet?`);
  }

  const uploadedFile = await client.getDocument({
    documentID: getDocumentID(frontmatter.metadata.id, client.baseURL),
  });

  if (uploadedFile.code === undefined) {
    throw new Error(`Diagram at ${title} has no code, please use \`push\` first.`);
  }

  const newFile = injectFrontMatter(uploadedFile.code, { id: frontmatter.metadata.id });

  return newFile;
}

interface PushOptions extends CommonOptions {}

/**
 * Push the given diagram to MermaidChart.com
 */
export async function push(diagram: string, client: MermaidChart, { title }: PushOptions) {
  const frontmatter = extractFrontMatter(diagram);

  if (frontmatter.metadata.id === undefined) {
    throw new Error(`Diagram at ${title} has no id, have you run \`link\` yet?`);
  }

  // TODO: check if file has changed since last push and print a warning
  const existingDiagram = await client.getDocument({
    documentID: getDocumentID(frontmatter.metadata.id, client.baseURL),
  });

  // due to MC-1056, try to remove YAML frontmatter if we can
  const diagramToUpload = removeFrontMatterKeys(diagram, new Set(['id']));

  if (existingDiagram.code === diagramToUpload) {
    console.log(`✅ - ${title} is up to date`);
  } else {
    await client.setDocument({
      projectID: existingDiagram.projectID,
      documentID: existingDiagram.documentID,
      code: diagramToUpload,
    });
    console.log(`✅ - ${title} was pushed`);
  }
}
