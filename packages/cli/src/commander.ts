import {
  Argument,
  CommanderError,
  createCommand,
  InvalidArgumentError,
} from '@commander-js/extra-typings';
import { readFile, writeFile } from 'fs/promises';
import { extractFrontMatter, removeFrontMatterKeys, injectFrontMatter } from './frontmatter.js';
import { MermaidChart } from '@mermaidchart/sdk';

import input from '@inquirer/input';
import select, { Separator } from '@inquirer/select';
import { type Config, defaultConfigPath, readConfig, writeConfig } from './config.js';

/**
 * Global configuration option for the root Commander Command.
 *
 * Subcommands can access these options with {@link Command.optsWithGlobals}.
 *
 * We need to define this manually as a `type`, as
 * https://github.com/commander-js/extra-typings doesn't yet have a better way
 * to write this type.
 */
type CommonOptions = ReturnType<ReturnType<typeof createCommanderCommand>['opts']>;

async function createClient(options: CommonOptions, config?: Config) {
  if (config === undefined) {
    try {
      config = await readConfig(options['config']);
    } catch (error) {
      if (
        error instanceof Error &&
        'errno' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT' &&
        options['config'] === defaultConfigPath()
      ) {
        config = {};
      }
      throw new InvalidArgumentError(
        `Failed to load config file ${options['config']} due to: ${error}`,
      );
    }
  }

  const client = new MermaidChart({
    clientID: '018bf0ff-7e8c-7952-ab4e-a7bd7c7f54f3',
    baseURL: new URL(config.base_url ?? 'https://mermaidchart.com').toString(),
  });

  if (config.auth_token === undefined) {
    throw new CommanderError(
      /*exitCode=*/ 1,
      'ENEEDAUTH',
      `This command requires you to be logged in. You need to login with the \`login\` command.`,
    );
  }

  try {
    await client.setAccessToken(config.auth_token);
  } catch (error) {
    if (error instanceof Error && error.message.includes('401')) {
      throw new CommanderError(
        /*exitCode=*/ 1,
        'ENEEDAUTH',
        `Invalid access token. Try logging in again with the \`login\` command.`,
      );
    }
  }

  return client;
}

function whoami() {
  return createCommand('whoami')
    .description('Display Mermaid Chart username')
    .action(async (_options, command) => {
      const optsWithGlobals = command.optsWithGlobals<CommonOptions>();
      const client = await createClient(optsWithGlobals);

      const user = await client.getUser();

      console.log(user.emailAddress);
    });
}

function login() {
  return createCommand('login')
    .description('Login to a Mermaid Chart account')
    .action(async (_options, command) => {
      const optsWithGlobals = command.optsWithGlobals<CommonOptions>();
      let config;
      try {
        config = await readConfig(optsWithGlobals['config']);
      } catch (error) {
        if (
          error instanceof Error &&
          'errno' in error &&
          (error as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
          config = {};
        } else {
          throw error;
        }
      }

      const baseURL = new URL(config.base_url ?? 'https://mermaidchart.com').toString();

      const client = new MermaidChart({
        clientID: '018bf0ff-7e8c-7952-ab4e-a7bd7c7f54f3',
        baseURL: baseURL,
      });

      const answer = await input({
        message: `Enter your API token. You can generate one at ${new URL(
          '/app/user/settings',
          baseURL,
        )}`,
        async validate(key) {
          try {
            await client.setAccessToken(key);
          } catch (error) {
            return `The given token is not valid: ${error}`;
          }
          return true;
        },
      });

      const user = await client.getUser();

      await writeConfig(optsWithGlobals['config'], { ...config, auth_token: answer });

      console.log(`API token for ${user.emailAddress} saved to ${optsWithGlobals['config']}`);
    });
}

function logout() {
  return createCommand('logout')
    .description('Log out of a Mermaid Chart account')
    .action(async (_options, command) => {
      const optsWithGlobals = command.optsWithGlobals<CommonOptions>();
      const { auth_token, ...config } = await readConfig(optsWithGlobals['config']);

      if (auth_token === undefined) {
        console.log(`Nothing to do, there's no auth_token in ${optsWithGlobals['config']}`);
      }

      await writeConfig(optsWithGlobals['config'], config);

      try {
        const user = await (await createClient(optsWithGlobals, config)).getUser();
        console.log(`API token for ${user.emailAddress} removed from ${optsWithGlobals['config']}`);
      } catch (error) {
        // API token might have been expired
        console.log(`API token removed from ${optsWithGlobals['config']}`);
      }
    });
}

function link() {
  return createCommand('link')
    .description('Link the given Mermaid diagram to Mermaid Chart')
    .addArgument(new Argument('<path>', 'The path of the file to link.'))
    .action(async (path, _options, command) => {
      const optsWithGlobals = command.optsWithGlobals<CommonOptions>();
      const client = await createClient(optsWithGlobals);
      const existingFile = await readFile(path, { encoding: 'utf8' });
      const frontmatter = extractFrontMatter(existingFile);

      if (frontmatter.metadata.id) {
        throw new CommanderError(
          /*exitCode=*/ 1,
          'EALREADY_LINKED',
          'This document already has an `id` field',
        );
      }

      const projects = await client.getProjects();

      const projectId = await select({
        message: 'Select a project to upload your document to',
        choices: [
          ...projects.map((project) => {
            return {
              name: project.title,
              value: project.id,
            };
          }),
          new Separator(
            `Or go to ${new URL('/app/projects', client.baseURL)} to create a new project`,
          ),
        ],
      });

      const createdDocument = await client.createDocument(projectId);

      const code = injectFrontMatter(existingFile, { id: createdDocument.documentID });

      await Promise.all([
        writeFile(path, code, { encoding: 'utf8' }),
        client.setDocument({
          projectID: createdDocument.projectID,
          documentID: createdDocument.documentID,
          title: path,
          code: existingFile,
        }),
      ]);
    });
}

function pull() {
  return createCommand('pull')
    .description('Pulls a document from from Mermaid Chart')
    .addArgument(new Argument('<path>', 'The path of the file to pull.'))
    .option('--check', 'Check whether the local file would be overwrited')
    .action(async (path, options, command) => {
      const optsWithGlobals = command.optsWithGlobals<CommonOptions>();
      const client = await createClient(optsWithGlobals);
      const text = await readFile(path, { encoding: 'utf8' });
      const frontmatter = extractFrontMatter(text);

      if (frontmatter.metadata.id === undefined) {
        throw new Error('Diagram has no id, have you run `link` yet?');
      }

      const uploadedFile = await client.getDocument({
        documentID: frontmatter.metadata.id,
      });

      if (uploadedFile.code === undefined) {
        throw new Error('Diagram has no code, please use push first');
      }

      const newFile = injectFrontMatter(uploadedFile.code, { id: frontmatter.metadata.id });

      if (text === newFile) {
        console.log(`✅ - ${path} is up to date`);
      } else {
        if (options['check']) {
          console.log(`❌ - ${path} would be updated`);
          process.exitCode = 1;
        } else {
          await writeFile(path, newFile, { encoding: 'utf8' });
          console.log(`✅ - ${path} was updated`);
        }
      }
    });
}

function push() {
  return createCommand('push')
    .description('Push a local diagram to Mermaid Chart')
    .addArgument(new Argument('<path>', 'The path of the file to push.'))
    .action(async (path, _options, command) => {
      const optsWithGlobals = command.optsWithGlobals<CommonOptions>();
      const client = await createClient(optsWithGlobals);
      const text = await readFile(path, { encoding: 'utf8' });
      const frontmatter = extractFrontMatter(text);

      if (frontmatter.metadata.id === undefined) {
        throw new Error('Diagram has no id, have you run `link` yet?');
      }

      // TODO: check if file has changed since last push and print a warning
      const existingDiagram = await client.getDocument({
        documentID: frontmatter.metadata.id,
      });

      // due to MC-1056, try to remove YAML frontmatter if we can
      const diagramToUpload = removeFrontMatterKeys(text, new Set(['id']));

      if (existingDiagram.code === diagramToUpload) {
        console.log(`✅ - ${path} is up to date`);
      } else {
        await client.setDocument({
          projectID: existingDiagram.projectID,
          documentID: existingDiagram.documentID,
          code: diagramToUpload,
        });
        console.log(`✅ - ${path} was pushed`);
      }
    });
}

export function createCommanderCommand() {
  const program = createCommand('mermaid-cli')
    .version('0.1.0-alpha.0') // TODO: how can we keep this synced with package.json
    .description(
      'CLI for interacting with https://MermaidChart.com, the platform that makes collaborating with Mermaid diagrams easy.',
    )
    .option(
      '-c, --config <config_file>',
      'The path to the config file to use.',
      defaultConfigPath(),
    );

  return program
    .addCommand(whoami())
    .addCommand(login())
    .addCommand(logout())
    .addCommand(link())
    .addCommand(pull())
    .addCommand(push());
}
