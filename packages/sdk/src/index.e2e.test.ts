/**
 * E2E tests
 */
import { MermaidChart } from './index.js';
import { beforeAll, describe, expect, it } from 'vitest';

import process from 'node:process';

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
