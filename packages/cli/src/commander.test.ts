import { beforeAll, beforeEach, describe, expect, vi, it, type Mock } from 'vitest';
import { createCommanderCommand } from './commander.js';
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import type { Command, CommanderError, OutputConfiguration } from '@commander-js/extra-typings';
import { MermaidChart } from '@mermaidchart/sdk';

import input from '@inquirer/input';
import select from '@inquirer/select';
import type { MCDocument, MCProject, MCUser } from '@mermaidchart/sdk/dist/types.js';

/** Config file with auth_key setup */
const CONFIG_AUTHED = 'test/fixtures/config-authed.toml';

type Optional<T> = T | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CommanderMocked<T extends Optional<(...args: any[]) => unknown>> = Mock<
  Parameters<NonNullable<T>>,
  ReturnType<NonNullable<T>>
>;

/**
 * Commander program with all output functions mocked.
 */
function mockedProgram() {
  const mocks = {
    writeOut: vi.fn() as CommanderMocked<OutputConfiguration['writeOut']>,
    writeErr: vi.fn() as CommanderMocked<OutputConfiguration['writeErr']>,
    outputError: vi.fn() as CommanderMocked<OutputConfiguration['outputError']>,
    // throw an error instead of stopping the program
    exitCallback: vi.fn().mockImplementation((error: CommanderError) => {
      throw error;
    }) as CommanderMocked<Parameters<Command['exitOverride']>[0]>,
  };

  const program = createCommanderCommand()
    .configureOutput({
      writeOut: mocks.writeOut,
      writeErr: mocks.writeErr,
      outputError: mocks.outputError,
    })
    .exitOverride(mocks.exitCallback);

  return { mocks, program };
}

beforeAll(async () => {
  await mkdir('test/output', { recursive: true });
});

const mockedMCUser = {
  fullName: 'My Test User',
  emailAddress: 'my-test-user@test.invalid',
} as const satisfies MCUser;
const mockedProjects = [
  {
    id: 'my-project-001',
    title: 'My test project',
  } satisfies MCProject,
] as const;

const mockedEmptyDiagram = {
  projectID: mockedProjects[0].id,
  id: 'my-test-diagram-id',
  major: 0,
  minor: 1,
  title: 'New diagram',
  documentID: 'my-test-document-id',
} as const satisfies MCDocument;

beforeEach(() => {
  vi.resetAllMocks();

  vi.mock('@mermaidchart/sdk');
  vi.mocked(MermaidChart.prototype.getUser).mockResolvedValue(mockedMCUser);
  vi.mocked(MermaidChart.prototype.getProjects).mockResolvedValue([...mockedProjects]);
  vi.spyOn(MermaidChart.prototype, 'baseURL', 'get').mockImplementation(
    () => 'https://test.mermaidchart.invalid',
  );
});

describe('--version', () => {
  it('should print version', async () => {
    const { mocks, program } = mockedProgram();

    const { version: expectedVersion } = JSON.parse(
      await readFile('./package.json', { encoding: 'utf8' }),
    ) as { version: string };

    // should quit the program normally
    await expect(() => program.parseAsync(['--version'], { from: 'user' })).rejects.toThrowError();

    expect(mocks.writeErr).not.toHaveBeenCalled();
    expect(mocks.outputError).not.toHaveBeenCalled();
    expect(mocks.writeOut).toHaveBeenCalledOnce();
    expect(mocks.writeOut).toBeCalledWith(`${expectedVersion}\n`);
  });
});

describe('whoami', () => {
  it('should error if --config file does not exist', async () => {
    const { program } = mockedProgram();

    await expect(
      program.parseAsync(['--config', 'test/output/this-file-does-not-exist.toml', 'whoami'], {
        from: 'user',
      }),
    ).rejects.toThrowError('Failed to load config file');
  });

  it('should error if not logged in', async () => {
    const { program } = mockedProgram();

    await expect(
      program.parseAsync(['--config', 'test/fixtures/config-unauthed.toml', 'whoami'], {
        from: 'user',
      }),
    ).rejects.toThrowError('This command requires you to be logged in.');
  });

  it('should error if logged in with bad key', async () => {
    const { program } = mockedProgram();

    vi.mocked(MermaidChart.prototype.setAccessToken).mockRejectedValue(new Error('401'));

    await expect(
      program.parseAsync(['--config', CONFIG_AUTHED, 'whoami'], { from: 'user' }),
    ).rejects.toThrowError('Invalid access token.');
  });

  it('should print email of logged in user', async () => {
    const { program } = mockedProgram();

    const consoleLogSpy = vi.spyOn(global.console, 'log');
    await program.parseAsync(['--config', CONFIG_AUTHED, 'whoami'], { from: 'user' });

    expect(consoleLogSpy).toBeCalledWith(mockedMCUser.emailAddress);
  });
});

describe('login', () => {
  const configFile = 'test/output/my-config.toml';

  beforeEach(async () => {
    await rm(configFile, { force: true });
  });

  it('should save token to new config file shown in `--config`', async () => {
    const { program } = mockedProgram();

    vi.mock('@inquirer/input');
    vi.mocked(input).mockResolvedValueOnce('my-api-key');

    const consoleLogSpy = vi.spyOn(global.console, 'log');

    await program.parseAsync(['--config', configFile, 'login'], { from: 'user' });

    expect(consoleLogSpy).toBeCalledWith(
      `API token for ${mockedMCUser.emailAddress} saved to test/output/my-config.toml`,
    );

    await expect(readFile(configFile, { encoding: 'utf8' })).resolves.toContain('my-api-key');
  });
});

describe('logout', () => {
  const configFile = 'test/output/config-authed.toml';

  beforeEach(async () => {
    await copyFile(CONFIG_AUTHED, configFile);
  });

  it('should remove token from config file shown in `--config`', async () => {
    const { program } = mockedProgram();

    const consoleLogSpy = vi.spyOn(global.console, 'log');

    await expect(readFile(configFile, { encoding: 'utf8' })).resolves.toContain('my-api-key');

    await program.parseAsync(['--config', configFile, 'logout'], { from: 'user' });

    await expect(readFile(configFile, { encoding: 'utf8' })).resolves.not.toContain('my-api-key');

    expect(consoleLogSpy).toBeCalledWith(`API token removed from ${configFile}`);
  });
});

describe('link', () => {
  const diagram = 'test/output/unsynced.mmd';

  beforeEach(async () => {
    await copyFile('test/fixtures/unsynced.mmd', diagram);
  });

  it('should create a new diagram on MermaidChart and add id to frontmatter', async () => {
    const { program } = mockedProgram();

    vi.mock('@inquirer/select');
    vi.mocked(select).mockResolvedValueOnce(mockedProjects[0].id);

    vi.mocked(MermaidChart.prototype.createDocument).mockResolvedValueOnce(mockedEmptyDiagram);

    await expect(readFile(diagram, { encoding: 'utf8' })).resolves.not.toContain(/^id:/);

    await program.parseAsync(['--config', CONFIG_AUTHED, 'link', diagram], { from: 'user' });

    expect(vi.mocked(MermaidChart.prototype.setDocument)).toHaveBeenCalledWith(
      expect.objectContaining({
        code: expect.not.stringContaining('id:'), // id: field should not be uploaded
        title: diagram, // title should default to file name
      }),
    );

    await expect(readFile(diagram, { encoding: 'utf8' })).resolves.toContain(
      `id: ${mockedEmptyDiagram.documentID}`,
    );
  });
});

describe('pull', () => {
  const diagram = 'test/output/connected-diagram.mmd';

  beforeEach(async () => {
    await copyFile('test/fixtures/connected-diagram.mmd', diagram);
  });

  it('should fail if MermaidChart document has not yet been linked', async () => {
    const { program } = mockedProgram();

    await expect(
      program.parseAsync(['--config', CONFIG_AUTHED, 'pull', 'test/fixtures/unsynced.mmd'], {
        from: 'user',
      }),
    ).rejects.toThrowError('Diagram at test/fixtures/unsynced.mmd has no id');
  });

  it('should fail if MermaidChart document has no code', async () => {
    const { program } = mockedProgram();

    vi.mocked(MermaidChart.prototype.getDocument).mockResolvedValueOnce(mockedEmptyDiagram);

    await expect(
      program.parseAsync(['--config', CONFIG_AUTHED, 'pull', diagram], { from: 'user' }),
    ).rejects.toThrowError(`Diagram at ${diagram} has no code`);
  });

  it('should pull document and add a `id:` field to frontmatter', async () => {
    const { program } = mockedProgram();

    const mockedDiagram = {
      ...mockedEmptyDiagram,
      code: `---
title: My cool flowchart
---
  flowchart TD
      A[I've been updated!]`,
    };

    vi.mocked(MermaidChart.prototype.getDocument).mockResolvedValueOnce(mockedDiagram);

    await program.parseAsync(['--config', CONFIG_AUTHED, 'pull', diagram], { from: 'user' });

    const diagramContents = await readFile(diagram, { encoding: 'utf8' });

    expect(diagramContents).toContain(`id: ${mockedDiagram.documentID}`);
    expect(diagramContents).toContain("flowchart TD\n      A[I've been updated!]");
  });
});

describe('push', () => {
  const diagram = 'test/output/connected-diagram.mmd';

  beforeEach(async () => {
    await copyFile('test/fixtures/connected-diagram.mmd', diagram);
  });

  it('should fail if MermaidChart document has not yet been linked', async () => {
    const { program } = mockedProgram();

    await expect(
      program.parseAsync(['--config', CONFIG_AUTHED, 'push', 'test/fixtures/unsynced.mmd'], {
        from: 'user',
      }),
    ).rejects.toThrowError('Diagram at test/fixtures/unsynced.mmd has no id');
  });

  it('should push document and remove the `id:` field front frontmatter', async () => {
    const { program } = mockedProgram();

    vi.mocked(MermaidChart.prototype.getDocument).mockResolvedValueOnce(mockedEmptyDiagram);

    await expect(readFile(diagram, { encoding: 'utf8' })).resolves.not.toContain(/^id:/);

    await program.parseAsync(['--config', CONFIG_AUTHED, 'push', diagram], { from: 'user' });

    expect(vi.mocked(MermaidChart.prototype.setDocument)).toHaveBeenCalledOnce();
    expect(vi.mocked(MermaidChart.prototype.setDocument)).toHaveBeenCalledWith(
      expect.objectContaining({
        code: expect.not.stringContaining('id:'),
      }),
    );
  });
});
