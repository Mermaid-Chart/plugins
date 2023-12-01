import { beforeAll, beforeEach, describe, expect, vi, it, type Mock } from 'vitest';
import { createCommanderCommand } from './commander.js';
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import type { Command, CommanderError, OutputConfiguration } from '@commander-js/extra-typings';
import { MermaidChart } from '@mermaidchart/sdk';

import confirm from '@inquirer/confirm';
import input from '@inquirer/input';
import select from '@inquirer/select';
import type { MCDocument, MCProject, MCUser } from '@mermaidchart/sdk/dist/types.js';

/** Config file with auth_key setup */
const CONFIG_AUTHED = 'test/fixtures/config-authed.toml';
/** Markdown file that has every Mermaid diagrams already linked */
const LINKED_MARKDOWN_FILE = 'test/fixtures/linked-markdown-file.md';
/** Markdown file that has some linked and some unlinked Mermaid diagrams */
const PARTIALLY_LINKED_MARKDOWN_FILE = 'test/fixtures/partially-linked-markdown-file.md';
/** Markdown file that has unlinked Mermaid diagrams */
const UNLINKED_MARKDOWN_FILE = 'test/fixtures/unlinked-markdown-file.md';

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
  const diagram2 = 'test/output/unsynced2.mmd';
  const diagram3 = 'test/output/unsynced3.mmd';

  beforeEach(async () => {
    await Promise.all([
      copyFile('test/fixtures/unsynced.mmd', diagram),
      copyFile('test/fixtures/unsynced.mmd', diagram2),
      copyFile('test/fixtures/unsynced.mmd', diagram3),
    ]);
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

  for (const rememberProjectId of [true, false]) {
    it(`should link multiple diagrams ${
      rememberProjectId ? 'and remember project id' : ''
    }`, async () => {
      const { program } = mockedProgram();

      vi.mock('@inquirer/confirm');
      vi.mock('@inquirer/select');
      vi.mocked(confirm).mockResolvedValue(rememberProjectId);
      vi.mocked(select).mockResolvedValue(mockedProjects[0].id);

      vi.mocked(MermaidChart.prototype.createDocument).mockResolvedValue(mockedEmptyDiagram);

      await expect(readFile(diagram, { encoding: 'utf8' })).resolves.not.toContain(/^id:/);

      await program.parseAsync(['--config', CONFIG_AUTHED, 'link', diagram, diagram2, diagram3], {
        from: 'user',
      });

      if (rememberProjectId) {
        expect(vi.mocked(confirm)).toHaveBeenCalledOnce();
        expect(vi.mocked(select)).toHaveBeenCalledOnce();
      } else {
        // if the user didn't allow using the same project id for all diagrams,
        // ask every time
        expect(vi.mocked(confirm)).toHaveBeenCalledOnce();
        expect(vi.mocked(select)).toHaveBeenCalledTimes(3);
      }

      // should have uploaded and created three files
      expect(vi.mocked(MermaidChart.prototype.setDocument)).toHaveBeenCalledTimes(3);
      expect(vi.mocked(MermaidChart.prototype.setDocument)).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.not.stringContaining('id:'), // id: field should not be uploaded
          title: diagram, // title should default to file name
        }),
      );

      await Promise.all(
        [diagram, diagram2, diagram3].map(async (file) => {
          await expect(readFile(file, { encoding: 'utf8' })).resolves.toContain(
            `id: ${mockedEmptyDiagram.documentID}`,
          );
        }),
      );
    });
  }

  it('should link diagrams in a markdown file', async () => {
    const unlinkedMarkdownFile = 'test/output/markdown-file.md';
    await copyFile(UNLINKED_MARKDOWN_FILE, unlinkedMarkdownFile);

    const { program } = mockedProgram();

    vi.mock('@inquirer/confirm');
    vi.mock('@inquirer/select');
    vi.mocked(confirm).mockResolvedValue(true);
    vi.mocked(select).mockResolvedValueOnce(mockedProjects[0].id);

    vi.mocked(MermaidChart.prototype.createDocument)
      .mockResolvedValueOnce(mockedEmptyDiagram)
      .mockResolvedValueOnce({ ...mockedEmptyDiagram, documentID: 'second-id' });
    await program.parseAsync(['--config', CONFIG_AUTHED, 'link', unlinkedMarkdownFile], {
      from: 'user',
    });

    const file = await readFile(unlinkedMarkdownFile, { encoding: 'utf8' });

    expect(file).toMatch(`id: ${mockedEmptyDiagram.documentID}\n`);
    expect(file).toMatch(`id: second-id\n`);
  });

  it('should link diagrams in partially linked markdown file', async () => {
    const partiallyLinkedMarkdownFile = 'test/output/partially-linked-markdown-file.md';
    await copyFile(PARTIALLY_LINKED_MARKDOWN_FILE, partiallyLinkedMarkdownFile);

    const { program } = mockedProgram();

    vi.mock('@inquirer/confirm');
    vi.mock('@inquirer/select');
    vi.mocked(confirm).mockResolvedValue(true);
    vi.mocked(select).mockResolvedValueOnce(mockedProjects[0].id);

    vi.mocked(MermaidChart.prototype.createDocument).mockResolvedValueOnce({
      ...mockedEmptyDiagram,
      documentID: 'second-id',
    });
    await program.parseAsync(['--config', CONFIG_AUTHED, 'link', partiallyLinkedMarkdownFile], {
      from: 'user',
    });

    const file = await readFile(partiallyLinkedMarkdownFile, { encoding: 'utf8' });

    expect(file).toMatch(`id: second-id\n`);
  });
});

describe('pull', () => {
  const diagram = 'test/output/connected-diagram.mmd';
  const diagram2 = 'test/output/connected-diagram-2.mmd';
  const linkedMarkdownFile = 'test/output/linked-markdown-file.md';

  beforeEach(async () => {
    await Promise.all([
      copyFile('test/fixtures/connected-diagram.mmd', diagram),
      copyFile('test/fixtures/connected-diagram.mmd', diagram2),
      copyFile(LINKED_MARKDOWN_FILE, linkedMarkdownFile),
    ]);
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

  it('should pull documents and add a `id:` field to frontmatter', async () => {
    const { program } = mockedProgram();

    const mockedDiagram = {
      ...mockedEmptyDiagram,
      code: `---
title: My cool flowchart
---
  flowchart TD
      A[I've been updated!]`,
    };

    vi.mocked(MermaidChart.prototype.getDocument).mockResolvedValue(mockedDiagram);

    await program.parseAsync(['--config', CONFIG_AUTHED, 'pull', diagram, diagram2], {
      from: 'user',
    });

    for (const file of [diagram, diagram2]) {
      const diagramContents = await readFile(file, { encoding: 'utf8' });

      expect(diagramContents).toContain(`id: ${mockedDiagram.documentID}`);
      expect(diagramContents).toContain("flowchart TD\n      A[I've been updated!]");
    }
  });

  it('should pull documents from within markdown file', async () => {
    const { program } = mockedProgram();

    vi.mocked(MermaidChart.prototype.getDocument)
      .mockResolvedValueOnce({
        ...mockedEmptyDiagram,
        code: "flowchart TD\n      A[I've been updated!]",
      })
      .mockResolvedValueOnce({
        ...mockedEmptyDiagram,
        code: 'pie\n  "Flowchart" : 2',
      });

    await program.parseAsync(['--config', CONFIG_AUTHED, 'pull', linkedMarkdownFile], {
      from: 'user',
    });

    const file = await readFile(linkedMarkdownFile, { encoding: 'utf8' });

    expect(file).toMatch("flowchart TD\n      A[I've been updated!]");
    expect(file).toMatch('pie\n  "Flowchart" : 2');
  });
});

describe('push', () => {
  const diagram = 'test/output/connected-diagram.mmd';
  const diagram2 = 'test/output/connected-diagram-2.mmd';
  const linkedMarkdownFile = 'test/output/linked-markdown-file.md';

  beforeEach(async () => {
    await Promise.all([
      copyFile('test/fixtures/connected-diagram.mmd', diagram),
      copyFile('test/fixtures/connected-diagram.mmd', diagram2),
      copyFile(LINKED_MARKDOWN_FILE, linkedMarkdownFile),
    ]);
  });

  it('should fail if MermaidChart document has not yet been linked', async () => {
    const { program } = mockedProgram();

    await expect(
      program.parseAsync(['--config', CONFIG_AUTHED, 'push', 'test/fixtures/unsynced.mmd'], {
        from: 'user',
      }),
    ).rejects.toThrowError('Diagram at test/fixtures/unsynced.mmd has no id');
  });

  it('should push documents and remove the `id:` field front frontmatter', async () => {
    const { program } = mockedProgram();

    vi.mocked(MermaidChart.prototype.getDocument).mockResolvedValue(mockedEmptyDiagram);

    await expect(readFile(diagram, { encoding: 'utf8' })).resolves.not.toContain(/^id:/);

    await program.parseAsync(['--config', CONFIG_AUTHED, 'push', diagram, diagram2], {
      from: 'user',
    });

    expect(vi.mocked(MermaidChart.prototype.setDocument)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(MermaidChart.prototype.setDocument)).toHaveBeenCalledWith(
      expect.objectContaining({
        code: expect.not.stringContaining('id:'),
      }),
    );
  });

  it('should push documents from within markdown file', async () => {
    const { program } = mockedProgram();

    vi.mocked(MermaidChart.prototype.getDocument).mockResolvedValue(mockedEmptyDiagram);

    await program.parseAsync(['--config', CONFIG_AUTHED, 'push', linkedMarkdownFile], {
      from: 'user',
    });

    expect(vi.mocked(MermaidChart.prototype.setDocument)).toHaveBeenCalledTimes(2);
  });
});
