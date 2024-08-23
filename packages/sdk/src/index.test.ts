import { OAuth2Client } from '@badgateway/oauth2-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MermaidChart } from './index.js';
import type { AuthorizationData } from './types.js';

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
});
