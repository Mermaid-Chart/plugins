import {
  Argument,
  CommanderError,
  createCommand,
  InvalidArgumentError,
} from '@commander-js/extra-typings';
import { readFile, writeFile } from 'fs/promises';
import { MermaidChart } from '@mermaidchart/sdk';
import { createRequire } from 'node:module';
import confirm from '@inquirer/confirm';
import input from '@inquirer/input';
import select, { Separator } from '@inquirer/select';
import { type Config, defaultConfigPath, readConfig, writeConfig } from './config.js';
import { link, type LinkOptions, pull, push } from './methods.js';

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

function linkCmd() {
  return createCommand('link')
    .description('Link the given Mermaid diagrams to Mermaid Chart')
    .addArgument(new Argument('<path...>', 'The paths of the files to link.'))
    .action(async (paths, _options, command) => {
      const optsWithGlobals = command.optsWithGlobals<CommonOptions>();
      const client = await createClient(optsWithGlobals);

      // Ask the user which project they want to upload each diagram to
      const getProjectId: LinkOptions['getProjectId'] = async (cache, documentTitle) => {
        if (cache.previousSelectedProjectId !== undefined) {
          if (cache.usePreviousSelectedProjectId === undefined) {
            cache.usePreviousSelectedProjectId = confirm({
              message: `Would you like to upload all diagrams to this project?`,
              default: true,
            });
          }
          if (await cache.usePreviousSelectedProjectId) {
            return cache.previousSelectedProjectId;
          }
        }

        cache.projects = cache.projects ?? client.getProjects();
        const projectId = await select({
          message: `Select a project to upload ${documentTitle} to`,
          choices: [
            ...(await cache.projects).map((project) => {
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

        cache.previousSelectedProjectId = projectId;

        return projectId;
      };

      const linkCache = {};

      for (const path of paths) {
        const existingFile = await readFile(path, { encoding: 'utf8' });

        const linkedDiagram = await link(existingFile, client, {
          cache: linkCache,
          title: path,
          getProjectId,
        });

        await writeFile(path, linkedDiagram, { encoding: 'utf8' });
      }
    });
}

function pullCmd() {
  return createCommand('pull')
    .description('Pulls documents from Mermaid Chart')
    .addArgument(new Argument('<path...>', 'The paths of the files to pull.'))
    .option('--check', 'Check whether the local files would be overwrited')
    .action(async (paths, options, command) => {
      const optsWithGlobals = command.optsWithGlobals<CommonOptions>();
      const client = await createClient(optsWithGlobals);
      await Promise.all(
        paths.map(async (path) => {
          const text = await readFile(path, { encoding: 'utf8' });

          const newFile = await pull(text, client, { title: path });

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
        }),
      );
    });
}

function pushCmd() {
  return createCommand('push')
    .description('Push local diagrams to Mermaid Chart')
    .addArgument(new Argument('<path...>', 'The paths of the files to push.'))
    .action(async (paths, _options, command) => {
      const optsWithGlobals = command.optsWithGlobals<CommonOptions>();
      const client = await createClient(optsWithGlobals);
      await Promise.all(
        paths.map(async (path) => {
          const text = await readFile(path, { encoding: 'utf8' });

          await push(text, client, { title: path });
        }),
      );
    });
}

export function createCommanderCommand() {
  const require = createRequire(import.meta.url);
  const pkg = require('../package.json');

  const program = createCommand('mermaid-cli')
    .version(pkg.version)
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
    .addCommand(linkCmd())
    .addCommand(pullCmd())
    .addCommand(pushCmd());
}
