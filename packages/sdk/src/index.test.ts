import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MermaidChart } from './index.js';
import { AICreditsLimitExceededError } from './errors.js';
import type { AuthorizationData } from './types.js';

import { OAuth2Client } from '@badgateway/oauth2-client';

const mockOAuth2ClientRequest = (async (endpoint, _body) => {
  switch (endpoint) {
    case 'tokenEndpoint':
      return {
        access_token: 'test-example-access_token',
        refresh_token: 'test-example-refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
      };
    default:
      throw new Error('mock unimplemented');
  }
}) as typeof OAuth2Client.prototype.request;

describe('MermaidChart', () => {
  let client: MermaidChart;
  beforeEach(() => {
    vi.resetAllMocks();

    vi.spyOn(OAuth2Client.prototype, 'request').mockImplementation(mockOAuth2ClientRequest);

    client = new MermaidChart({
      clientID: '00000000-0000-0000-0000-000000000dead',
      baseURL: 'https://test.mermaidchart.invalid',
      redirectURI: 'https://localhost.invalid',
    });

    vi.spyOn(client, 'getUser').mockImplementation(async () => {
      return {
        fullName: 'Test User',
        emailAddress: 'test@invalid.invalid',
      };
    });
  });

  describe('#getAuthorizationData', () => {
    it('should set default state', async () => {
      const { state, url } = await client.getAuthorizationData();

      expect(new URL(url).searchParams.has('state', state)).toBeTruthy();
    });
  });

  describe('#handleAuthorizationResponse', () => {
    let state: AuthorizationData['state'];
    beforeEach(async () => {
      ({ state } = await client.getAuthorizationData({ state }));
    });

    it('should set token', async () => {
      const code = 'hello-world';

      await client.handleAuthorizationResponse(
        `https://response.invalid?code=${code}&state=${state}`,
      );
      await expect(client.getAccessToken()).resolves.toBe('test-example-access_token');
    });

    it('should throw with invalid state', async () => {
      await expect(() =>
        client.handleAuthorizationResponse(
          'https://response.invalid?code=hello-world&state=my-invalid-state',
        ),
      ).rejects.toThrowError('invalid_state');
    });

    it('should throw with nicer error if URL has no query params', async () => {
      await expect(() =>
        client.handleAuthorizationResponse(
          // missing the ? so it's not read as a query
          'code=hello-world&state=my-invalid-state',
        ),
      ).rejects.toThrowError(/no query parameters/);
    });

    it('should work in Node.JS with url fragment', async () => {
      const code = 'hello-nodejs-world';
      await client.handleAuthorizationResponse(`?code=${code}&state=${state}`);
      await expect(client.getAccessToken()).resolves.toBe('test-example-access_token');
    });
  });

  describe('#diagramChat', () => {
    beforeEach(async () => {
      await client.setAccessToken('test-access-token');
    });

    it('should parse JSON response with text and documentChatThreadID', async () => {
      const jsonResponse = {
        text: 'Hello, here is your diagram!',
        documentChatThreadID: 'thread-abc-123',
        documentID: 'doc-123',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn((client as any).axios, 'post').mockResolvedValue({ data: jsonResponse });

      const result = await client.diagramChat({
        message: 'Create a flowchart',
        documentID: 'doc-123',
      });

      expect(result.text).toBe('Hello, here is your diagram!');
      expect(result.documentChatThreadID).toBe('thread-abc-123');
      expect(result.documentID).toBe('doc-123');
    });

    it('should throw AICreditsLimitExceededError on 402', async () => {
      // Mock the underlying axios call to simulate a 402 response from the API
      // so the actual error-mapping logic inside diagramChat() is exercised.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn((client as any).axios, 'post').mockRejectedValue({
        response: {
          status: 402,
          data: 'AI credits limit exceeded',
        },
      });

      await expect(
        client.diagramChat({
          message: 'Create a flowchart',
          documentID: 'doc-123',
        }),
      ).rejects.toThrow(AICreditsLimitExceededError);
    });
  });

  describe('#repairDiagram', () => {
    beforeEach(async () => {
      await client.setAccessToken('test-access-token');
    });

    it('should repair diagram successfully', async () => {
      vi.spyOn(client, 'repairDiagram').mockResolvedValue({
        result: 'ok' as const,
        code: '```mermaid\ngraph TD\n    A[Start] --> B[End]\n```',
        solved: true,
      });

      const result = await client.repairDiagram({
        code: 'graph TD\n    A[Start] --> B{Decision}',
        error: 'Syntax error',
      });

      expect(result.result).toBe('ok');
      expect(result.solved).toBe(true);
    });

    it('should throw AICreditsLimitExceededError on 402', async () => {
      // Mock the underlying axios call to simulate a 402 response from the API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn((client as any).axios, 'post').mockRejectedValue({
        response: {
          status: 402,
          data: 'AI credits limit exceeded',
        },
      });

      await expect(
        client.repairDiagram({
          code: 'graph TD\n    A --> B',
          error: 'Syntax error',
        }),
      ).rejects.toThrow(AICreditsLimitExceededError);
    });
  });

  describe('#mermaidPrSuggestion', () => {
    beforeEach(async () => {
      await client.setAccessToken('test-access-token');
    });

    it('should return title and description from diagram diff', async () => {
      vi.spyOn(client, 'mermaidPrSuggestion').mockResolvedValue({
        title: 'Add validation step to flowchart',
        description: '## What changed\n- Added node C',
      });

      const result = await client.mermaidPrSuggestion({
        originalDiagram: 'flowchart TD\n  A --> B',
        editedDiagram: 'flowchart TD\n  A --> B\n  B --> C[Validate]',
      });

      expect(result.title).toContain('validation');
      expect(result.description).toContain('What changed');
    });

    it('should throw AICreditsLimitExceededError on 402', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn((client as any).axios, 'post').mockRejectedValue({
        response: {
          status: 402,
          data: 'AI credits limit exceeded',
        },
      });

      await expect(
        client.mermaidPrSuggestion({
          originalDiagram: 'flowchart TD\n  A --> B',
          editedDiagram: 'flowchart TD\n  A --> B\n  B --> C',
        }),
      ).rejects.toThrow(AICreditsLimitExceededError);
    });
  });
});
