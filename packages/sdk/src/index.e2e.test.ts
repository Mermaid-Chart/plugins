/**
 * E2E tests
 */
import { MermaidChart } from './index.js';
import { beforeAll, describe, expect, it } from 'vitest';

import process from 'node:process';
import { AxiosError } from 'axios';

// hard-coded, replace with your own project,
// or ask alois is you want this to be shared with your account
const testProjectId = '316557b3-cb6f-47ed-acf7-fcfb7ce188d5';

let client: MermaidChart;

beforeAll(async() => {
  if (!process.env.TEST_MERMAIDCHART_API_TOKEN) {
    throw new Error(
      "Missing required environment variable TEST_MERMAIDCHART_API_TOKEN. "
      + "Please go to https://test.mermaidchart.com/app/user/settings and create one."
    );
  }

  client = new MermaidChart({
    clientID: '00000000-0000-0000-0000-000000git000test',
    baseURL: 'https://test.mermaidchart.com',
    redirectURI: 'https://localhost.invalid',
  });

  await client.setAccessToken(process.env.TEST_MERMAIDCHART_API_TOKEN);
});

describe('getUser', () => {
  it("should get user", async() => {
    const user = await client.getUser();

    expect(user).toHaveProperty('emailAddress');
  });
});

const documentMatcher = expect.objectContaining({
  documentID: expect.any(String),
  major: expect.any(Number),
  minor: expect.any(Number),
});

describe('createDocument', () => {
  it('should create document in project', async() => {
    const existingDocuments = await client.getDocuments(testProjectId);

    const newDocument = await client.createDocument(testProjectId);

    expect(newDocument).toStrictEqual(documentMatcher);

    const updatedProjectDocuments = await client.getDocuments(testProjectId);

    expect(existingDocuments).not.toContainEqual(newDocument);
    expect(updatedProjectDocuments).toContainEqual(newDocument);
  });
});

describe("getDocument", () => {
  it("should get publicly shared diagram", async() => {
    const latestDocument = await client.getDocument({
      // owned by alois@mermaidchart.com
      documentID: '8bce727b-69b7-4f6e-a434-d578e2b363ff',
    });

    expect(latestDocument).toStrictEqual(documentMatcher);

    const earliestDocument = await client.getDocument({
      // owned by alois@mermaidchart.com
      documentID: '8bce727b-69b7-4f6e-a434-d578e2b363ff',
      major: 0,
      minor: 1,
    });

    expect(earliestDocument).toStrictEqual(documentMatcher);
  });

  it("should throw 404 on unknown document", async() => {
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

