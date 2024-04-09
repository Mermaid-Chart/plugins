/**
 * Copied from https://github.com/mermaid-js/mermaid/blob/4a4e614b646bdb5f91f02d0483a7704b315d09fd/packages/mermaid/src/diagram-api/regexes.ts
 */

// The "* as yaml" part is necessary for tree-shaking
import * as yaml from 'js-yaml';

const frontMatterRegex = /^-{3}\s*[\n\r](.*?)[\n\r]-{3}\s*[\n\r]+/s;
const urlIDRegex = /(?<baseURL>.*)\/d\/(?<documentID>[\w-]+)/;

type UrlID = `${string}/d/${string}`;

export function getDocumentID(urlID: UrlID, expectedbaseURL: string) {
  const match = urlID.match(urlIDRegex);
  if (match === null) {
    throw new Error(
      `Invalid document ID: ${urlID}. Please report this issue to the @mermaidchart/cli maintainers.`,
    );
  }
  // we know that this regex will always return groups on a match
  const { baseURL, documentID } = match.groups as { baseURL: string; documentID: string };
  if (baseURL !== expectedbaseURL) {
    throw new Error(
      `Your @mermaidchart/cli is configured to use ${expectedbaseURL}, but your diagram is using ${baseURL}`,
    );
  }
  return documentID;
}
export function createUrlID(baseURL: string, documentID: string): UrlID {
  return `${baseURL}/d/${documentID}`;
}

interface FrontMatterMetadata {
  title?: string;
  // Allows custom display modes. Currently used for compact mode in gantt charts.
  displayMode?: string;
  config?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Unique ID for the diagram, e.g. `https://www.mermaidchart.com/d/xxxxxx-xxxx-xxxxx` */
  id?: UrlID;
}

export interface FrontMatterResult {
  text: string;
  metadata: FrontMatterMetadata;
}

function splitFrontMatter(text: string) {
  const matches = text.match(frontMatterRegex);
  if (!matches || !matches[1]) {
    return {
      diagramText: text,
      frontMatter: '',
    };
  } else {
    return {
      diagramText: text.slice(matches[0].length),
      frontMatter: matches[1],
    };
  }
}

function parseFrontMatterYAML(frontMatterYaml: string) {
  let parsed: FrontMatterMetadata =
    // TODO: replace with https://www.npmjs.com/package/yaml so that we can
    //       read/write comments too
    yaml.load(frontMatterYaml, {
      // To support config, we need JSON schema.
      // https://www.yaml.org/spec/1.2/spec.html#id2803231
      schema: yaml.JSON_SCHEMA,
    }) ?? {};

  // To handle runtime data type changes
  parsed = typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};

  return parsed;
}

/**
 * Extract and parse frontmatter from text, if present, and sets appropriate
 * properties in the provided db.
 *
 * @param text - The text that may have a YAML frontmatter.
 * @returns text with frontmatter stripped out
 */
export function extractFrontMatter(text: string): FrontMatterResult {
  const { diagramText, frontMatter } = splitFrontMatter(text);

  const parsed = parseFrontMatterYAML(frontMatter);

  const metadata: FrontMatterMetadata = {};

  // Only add properties that are explicitly supported, if they exist
  if (parsed.displayMode) {
    metadata.displayMode = parsed.displayMode.toString();
  }
  if (parsed.title) {
    metadata.title = parsed.title.toString();
  }
  if (parsed.config) {
    metadata.config = parsed.config;
  }
  if (parsed.id) {
    metadata.id = parsed.id;
  }

  return {
    text: diagramText,
    metadata,
  };
}

/**
 * Update the frontmatter of the given diagram.
 *
 * @param text - The text that may have a YAML frontmatter.
 * @param newMetadata - The metadata fields to update.
 * @returns The text with the updated YAML frontmatter.
 */
export function injectFrontMatter(text: string, newMetadata: Partial<FrontMatterMetadata>) {
  const { diagramText, frontMatter } = splitFrontMatter(text);

  const parsed = parseFrontMatterYAML(frontMatter);

  const mergedFrontmatter = { ...parsed, ...newMetadata };

  return `---\n${yaml.dump(mergedFrontmatter, {
    schema: yaml.JSON_SCHEMA,
  })}---\n${diagramText}`;
}

/**
 * Remove the given frontmatter keys.
 *
 * @param text - The text that may have a YAML frontmatter.
 * @param keysToRemove - The frontmatter fields to remove.
 * @returns The text with the updated YAML frontmatter, or no YAML frontmatter.
 */
export function removeFrontMatterKeys(text: string, keysToRemove: Set<keyof FrontMatterMetadata>) {
  const { diagramText, frontMatter } = splitFrontMatter(text);

  const parsedFrontMatter = parseFrontMatterYAML(frontMatter);

  const entries = Object.entries(parsedFrontMatter)
    .map((val) => {
      if (keysToRemove.has(val[0] as keyof FrontMatterMetadata)) {
        return null;
      } else {
        return val;
      }
    })
    .filter((val) => val) as [string, any][]; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (entries.length === 0) {
    // skip creating frontmatter if there is no frontmatter
    return diagramText;
  } else {
    return `---\n${yaml.dump(Object.fromEntries(entries), {
      schema: yaml.JSON_SCHEMA,
    })}---\n${diagramText}`;
  }
}
