import type { Root, Code } from 'mdast';
import type { VFile } from 'vfile';
import { visit } from 'unist-util-visit';
import type { MermaidChart } from '@mermaidchart/sdk';
import { type LinkOptions, link, pull, push } from './methods.js';

import { remark } from 'remark';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { read, write } from 'to-vfile';
interface MCPluginCommonOptions {
  /** Authenticated client */
  client: MermaidChart;
}

type MCPluginLinkOptions = MCPluginCommonOptions & {
  command: 'link';
} & Pick<LinkOptions, 'cache' | 'getProjectId'>;

interface MCPluginPullOptions extends MCPluginCommonOptions {
  command: 'pull';
  check: boolean;
}

interface MCPluginPushOptions extends MCPluginCommonOptions {
  command: 'push';
}

export type MCPluginOptions = MCPluginLinkOptions | MCPluginPullOptions | MCPluginPushOptions;

/**
 * UnifiedJS plugin for syncing mermaid diagrams in a markdown file with
 * MermaidChart.com
 *
 * @param options - Options.
 */
export function plugin({ client, ...options }: MCPluginOptions) {
  return async function (tree: Root, file: VFile) {
    const mermaidNodes: Code[] = [];
    visit(tree, (node) => {
      if (node.type === 'code' && node?.lang === 'mermaid') {
        mermaidNodes.push(node);
      }
    });

    if (mermaidNodes.length == 0) {
      console.log(`○ - ${file.basename} ignored, as it has no mermaid diagrams`);
    }

    for (const node of mermaidNodes) {
      const title = `${file.basename}:${node.position?.start.line}`;
      switch (options.command) {
        case 'link':
          node.value = await link(node.value, client, {
            cache: options.cache,
            title: ``,
            getProjectId: options.getProjectId,
            ignoreAlreadyLinked: true,
          });
          break;
        case 'pull': {
          const newValue = await pull(node.value, client, { title });

          if (node.value === newValue) {
            console.log(`✅ - ${title} is up to date`);
          } else {
            if (options['check']) {
              console.log(`❌ - ${title} would be updated`);
              process.exitCode = 1;
            } else {
              node.value = newValue;
              console.log(`✅ - ${title} will be updated`);
            }
          }
          break;
        }
        case 'push':
          await push(node.value, client, { title });
      }
    }
  };
}

/**
 * Read, process, and potentially update the given markdown file.
 *
 * @param inputFile - The file to read from, and potentially write to.
 * @param options - Options to pass to {@link plugin}.
 */
export async function processMarkdown(inputFile: string, options: MCPluginOptions) {
  const inVFile = await read(inputFile);
  const outVFile = await remark()
    .use(remarkFrontmatter)
    .use(remarkGfm)
    .use(plugin, options)
    .process(inVFile);

  switch (options.command) {
    case 'link':
    case 'pull':
      await write(outVFile);
      break;
    case 'push':
    // no need to write-back any data to the file
  }
}
