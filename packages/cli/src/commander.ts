import {
  Argument,
  CommanderError,
  createCommand,
  InvalidArgumentError,
  Option,
} from '@commander-js/extra-typings';
import { readFile, writeFile } from 'fs/promises';
import { MermaidChart } from '@mermaidchart/sdk';

import confirm from '@inquirer/confirm';
import input from '@inquirer/input';
import select, { Separator } from '@inquirer/select';
import { defaultConfigPath, readConfig, writeConfig, optionNameMap } from './config.js';
import { type Cache, link, type LinkOptions, pull, push } from './methods.js';
import { processMarkdown } from './remark.js';

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

/**
 * Reads the config file from the given `--config <configPath>` argument, ignoring
 * ENONET errors if `ignoreENONET` is `true`.
 *
 * @param configPath - The path to the config file.
 * @param ignoreENONET - Whether to ignore ENONET errors.
 * @throws {@link InvalidArgumentError}
 * Thrown if:
 *  - The config file exists, but is not a valid TOML file.
 *  - The config file does not exist, and `ignoreENONET` is `false`.
 */
async function readConfigFromConfigArg(configPath: string, ignoreENONET: boolean = false) {
  try {
    return await readConfig(configPath);
  } catch (error) {
    if (
      error instanceof Error &&
      'errno' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT' &&
      ignoreENONET
    ) {
      return {};
    }
    throw new InvalidArgumentError(`Failed to load config file ${configPath} due to: ${error}`);
  }
}

async function createClient(options: CommonOptions) {
  const client = new MermaidChart({
    clientID: '018bf0ff-7e8c-7952-ab4e-a7bd7c7f54f3',
    baseURL: options.baseUrl,
  });

  if (options.authToken === undefined) {
    throw new CommanderError(
      /*exitCode=*/ 1,
      'ENEEDAUTH',
      `This command requires you to be logged in. You need to login with the \`login\` command.`,
    );
  }

  try {
    await client.setAccessToken(options.authToken);
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

      // empty if default config file doesn't exist
      const config = await readConfigFromConfigArg(
        optsWithGlobals['config'],
        /*ignoreENONET=*/ true,
      );

      const client = new MermaidChart({
        clientID: '018bf0ff-7e8c-7952-ab4e-a7bd7c7f54f3',
        baseURL: optsWithGlobals.baseUrl,
      });

      const answer = await input({
        message: `Enter your API token. You can generate one at ${new URL(
          '/app/user/settings',
          optsWithGlobals.baseUrl,
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
        const user = await (await createClient(optsWithGlobals)).getUser();
        console.log(`API token for ${user.emailAddress} removed from ${optsWithGlobals['config']}`);
      } catch (error) {
        // API token might have been expired
        console.log(`API token removed from ${optsWithGlobals['config']}`);
      }
    });
}

function isMarkdownFile(path: string): path is `${string}.${'md' | 'markdown'}` {
  return /\.(md|markdown)$/.test(path);
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

      const linkCache: Cache = {};

      for (const path of paths) {
        if (isMarkdownFile(path)) {
          await processMarkdown(path, { command: 'link', client, cache: linkCache, getProjectId });
          continue;
        }
        const existingFile = await readFile(path, { encoding: 'utf8' });

        const linkedDiagram = await link(existingFile, client, {
          cache: linkCache,
          title: path,
          getProjectId,
          ignoreAlreadyLinked: false,
        });

        await writeFile(path, linkedDiagram, { encoding: 'utf8' });
      }
    });
}

function pullCmd() {
  return createCommand('pull')
    .description('Pulls documents from Mermaid Chart')
    .addArgument(new Argument('<path...>', 'The paths of the files to pull.'))
    .option('--check', 'Check whether the local files would be overwrited', false)
    .action(async (paths, options, command) => {
      const optsWithGlobals = command.optsWithGlobals<CommonOptions>();
      const client = await createClient(optsWithGlobals);

      await Promise.all(
        paths.map(async (path) => {
          if (isMarkdownFile(path)) {
            await processMarkdown(path, { command: 'pull', client, check: options['check'] });
            return;
          }

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
          if (isMarkdownFile(path)) {
            await processMarkdown(path, { command: 'push', client });
            return;
          }

          const text = await readFile(path, { encoding: 'utf8' });

          await push(text, client, { title: path });
        }),
      );
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
    )
    .addOption(
      new Option(
        '--base-url <base_url>',
        'The base URL of the Mermaid Chart instance to use.',
      ).default('https://mermaidchart.com'),
    )
    .addOption(new Option('--auth-token <auth_token>', 'The Mermaid Chart API token to use.'))
    .hook('preSubcommand', async (command, actionCommand) => {
      const configPath = command.getOptionValue('config');
      /**
       * config file is allowed to not exist if:
       *   - the user is running the `login` command, we'll create a new config file if it doesn't exist
       */
      const ignoreENONET = configPath === defaultConfigPath() || actionCommand.name() === 'login';

      const config = await readConfigFromConfigArg(configPath, ignoreENONET);
      for (const key in config) {
        if (!(key in optionNameMap)) {
          console.warn(`Warning: Ignoring unrecognized config key: ${key} in ${configPath}`);
          continue;
        }
        const optionCommanderName = optionNameMap[key as keyof typeof optionNameMap];
        // config values only override default/implied values
        if (
          [undefined, 'default', 'implied'].includes(
            command.getOptionValueSource(optionCommanderName),
          )
        ) {
          command.setOptionValueWithSource(
            optionNameMap[key as keyof typeof optionNameMap],
            config[key],
            'config',
          );
        }
      }
    });

  return program
    .addCommand(whoami())
    .addCommand(login())
    .addCommand(logout())
    .addCommand(linkCmd())
    .addCommand(pullCmd())
    .addCommand(pushCmd());
}
