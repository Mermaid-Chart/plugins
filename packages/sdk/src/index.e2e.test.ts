/**
 * E2E tests
 */
import { MermaidChart } from './index.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import process from 'node:process';
import { AxiosError } from 'axios';
import type { MCDocument } from './types.js';

let testProjectId = '316557b3-cb6f-47ed-acf7-fcfb7ce188d5';
let baseURL = new URL('https://test.mermaidchart.com');

let client: MermaidChart;

beforeAll(async () => {
  if (process.env.TEST_MERMAIDCHART_BASE_URL) {
    try {
      baseURL = new URL(process.env.TEST_MERMAIDCHART_BASE_URL);
    } catch (err) {
      throw new Error('Invalid URL in environment variable TEST_MERMAIDCHART_BASE_URL', {
        cause: err,
      });
    }
  } else {
    process.emitWarning(
      `Missing environment variable TEST_MERMAIDCHART_BASE_URL. Defaulting to ${baseURL.href}.`,
    );
  }

  if (!process.env.TEST_MERMAIDCHART_API_TOKEN) {
    throw new Error(
      'Missing required environment variable TEST_MERMAIDCHART_API_TOKEN. ' +
        `Please go to ${new URL('/app/user/settings', baseURL)} and create one.`,
    );
  }

  client = new MermaidChart({
    clientID: '00000000-0000-0000-0000-000000git000test',
    baseURL: baseURL.href,
    redirectURI: 'https://localhost.invalid',
  });

  await client.setAccessToken(process.env.TEST_MERMAIDCHART_API_TOKEN);

  const projects = await client.getProjects();

  // confirm that testProjectId is valid
  if (process.env.TEST_MERMAIDCHART_PROJECT_ID) {
    testProjectId = process.env.TEST_MERMAIDCHART_PROJECT_ID;
    if (!projects.some((project) => project.id === testProjectId)) {
      throw new Error(
        `Invalid environment variable TEST_MERMAIDCHART_PROJECT_ID. ` +
          `Please go to ${new URL(
            '/app/projects',
            baseURL,
          )} and create one that you have access to.`,
      );
    }
  } else {
    if (!projects.some((project) => project.id === testProjectId)) {
      throw new Error(
        `Missing environment variable TEST_MERMAIDCHART_PROJECT_ID. ` +
          `Please go to ${new URL('/app/projects', baseURL)} and create one.`,
      );
    }
    process.emitWarning(
      `Missing optional environment variable TEST_MERMAIDCHART_PROJECT_ID. Defaulting to ${testProjectId}`,
    );
  }
});

describe('getUser', () => {
  it('should get user', async () => {
    const user = await client.getUser();

    expect(user).toHaveProperty('emailAddress');
  });
});

const documentMatcher = expect.objectContaining({
  documentID: expect.any(String),
  major: expect.any(Number),
  minor: expect.any(Number),
});

/**
 * Cleanup created documents at the end of this test.
 */
const documentsToDelete = new Set<MCDocument['documentID']>();
afterAll(async () => {
  await Promise.all(
    [...documentsToDelete].map(async (document) => {
      if (documentsToDelete.delete(document)) {
        await client.deleteDocument(document);
      }
    }),
  );
});

describe('createDocument', () => {
  it('should create document in project', async () => {
    const existingDocuments = await client.getDocuments(testProjectId);

    const newDocument = await client.createDocument(testProjectId);

    documentsToDelete.add(newDocument.documentID);

    expect(newDocument).toStrictEqual(documentMatcher);

    const updatedProjectDocuments = await client.getDocuments(testProjectId);

    expect(existingDocuments).not.toContainEqual(newDocument);
    expect(updatedProjectDocuments).toContainEqual(newDocument);
  });
});

describe('setDocument', () => {
  it('should set document', async () => {
    const newDocument = await client.createDocument(testProjectId);
    documentsToDelete.add(newDocument.documentID);

    const code = `flowchart LR
    A(Generated by<br><code>@mermaidchart/sdk</code><br>E2E tests)`;

    await client.setDocument({
      documentID: newDocument.documentID,
      projectID: newDocument.projectID,
      title: '@mermaidchart/sdk E2E test diagram',
      code,
    });

    const updatedDoc = await client.getDocument({
      documentID: newDocument.documentID,
    });
    expect(updatedDoc).toMatchObject({
      title: '@mermaidchart/sdk E2E test diagram',
      code,
    });
  });

  it('should throw an error on invalid data', async () => {
    const newDocument = await client.createDocument(testProjectId);
    documentsToDelete.add(newDocument.documentID);

    await expect(
      client.setDocument({
        documentID: newDocument.documentID,
        // @ts-expect-error not setting diagram `projectID` should throw an error
        projectID: null,
      }),
    ).rejects.toThrowError('400'); // should throw HTTP 400 error
  });
});

describe('deleteDocument', () => {
  it('should delete document', async () => {
    const newDocument = await client.createDocument(testProjectId);

    expect(await client.getDocuments(testProjectId)).toContainEqual(newDocument);

    const deletedDoc = await client.deleteDocument(newDocument.documentID);

    expect(deletedDoc.projectID).toStrictEqual(newDocument.projectID);

    expect(await client.getDocuments(testProjectId)).not.toContainEqual(newDocument);
  });
});

describe('getDocument', () => {
  it('should get diagram', async () => {
    const newDocument = await client.createDocument(testProjectId);

    documentsToDelete.add(newDocument.documentID);

    const latestDocument = await client.getDocument({
      documentID: newDocument.documentID,
      // major and minor are optional
    });

    expect(latestDocument).toStrictEqual(documentMatcher);

    const earliestDocument = await client.getDocument({
      documentID: newDocument.documentID,
      major: 0,
      minor: 1,
    });

    expect(earliestDocument).toStrictEqual(documentMatcher);
  });

  it('should throw 404 on unknown document', async () => {
    let error: AxiosError | undefined = undefined;
    try {
      await client.getDocument({
        documentID: '00000000-0000-0000-0000-0000deaddead',
      });
    } catch (err) {
      error = err as AxiosError;
    }

    expect(error).toBeInstanceOf(AxiosError);
    expect(error?.response?.status).toBe(404);
  });
});
