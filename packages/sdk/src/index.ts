import { OAuth2Client, generateCodeVerifier } from '@badgateway/oauth2-client';
import type { AxiosInstance, AxiosResponse } from 'axios';
import defaultAxios from 'axios';
import { v4 as uuid } from 'uuid';
import {
  AICreditsLimitExceededError,
  OAuthError,
  RequiredParameterMissingError,
} from './errors.js';
import type {
  AuthState,
  AuthorizationData,
  DiagramChatRequest,
  DiagramChatResponse,
  Document,
  InitParams,
  MCDocument,
  MCProject,
  MCUser,
  RepairDiagramRequest,
  RepairDiagramResponse,
  AICreditsUsage,
} from './types.js';
import { URLS } from './urls.js';

const defaultBaseURL = 'https://www.mermaid.ai'; // "http://127.0.0.1:5174"
const authorizationURLTimeout = 60_000;

/**
 * Parses text tokens from a Vercel AI SDK data-stream response body.
 *
 * The stream format uses line prefixes:
 *   `0:"text_chunk"\n` – text token (JSON-encoded string)
 *   `2:[{"documentChatThreadID":"thread-abc-123"}]\n`      – data payload (JSON-encoded array)
 *   `e:{...}\n`        – step finish
 *   `d:{...}\n`        – stream done
 */
function parseVercelAIStreamText(rawBody: string): string {
  return rawBody
    .split('\n')
    .filter((line) => line.startsWith('0:'))
    .map((line) => {
      try {
        const value = JSON.parse(line.slice(2));
        return typeof value === 'string' ? value : '';
      } catch {
        return '';
      }
    })
    .join('');
}

/**
 * Extracts data payloads from a Vercel AI SDK data-stream response body.
 * Returns the first `documentChatThreadID` found in the stream, if any.
 */
function parseVercelAIStreamData(rawBody: string): { documentChatThreadID?: string } {
  let documentChatThreadID: string | undefined;

  for (const line of rawBody.split('\n')) {
    if (!line.startsWith('2:')) {
      continue;
    }
    try {
      const items: unknown[] = JSON.parse(line.slice(2));
      for (const item of items) {
        if (item && typeof item === 'object' && 'documentChatThreadID' in item) {
          const value = (item as Record<string, unknown>).documentChatThreadID;
          if (typeof value === 'string') {
            documentChatThreadID = value;
            break;
          }
        }
      }
    } catch {
      // ignore malformed lines
    }
    if (documentChatThreadID) {
      break;
    }
  }

  return { documentChatThreadID };
}

export class MermaidChart {
  private clientID: string;
  #baseURL!: string;
  private axios!: AxiosInstance;
  private oauth!: OAuth2Client;
  private pendingStates: Record<string, AuthState> = {};
  private redirectURI!: string;
  private accessToken?: string;
  private requestTimeout = 30_000;

  constructor({ clientID, baseURL, redirectURI, requestTimeout }: InitParams) {
    this.clientID = clientID;
    // Set requestTimeout BEFORE calling setBaseURL so axios is created with the correct timeout
    if (requestTimeout) {
      this.requestTimeout = requestTimeout;
    }
    this.setBaseURL(baseURL || defaultBaseURL);
    if (redirectURI) {
      this.setRedirectURI(redirectURI);
    }
  }

  public setRedirectURI(redirectURI: string) {
    this.redirectURI = redirectURI;
  }

  public setBaseURL(baseURL: string = defaultBaseURL) {
    if (this.#baseURL && this.#baseURL === baseURL) {
      return;
    }
    this.#baseURL = baseURL;
    this.accessToken = undefined;
    this.oauth = new OAuth2Client({
      server: this.#baseURL,
      clientId: this.clientID,
      tokenEndpoint: URLS.oauth.token,
      authorizationEndpoint: URLS.oauth.authorize,
    });
    this.axios = defaultAxios.create({
      baseURL: this.#baseURL,
      timeout: this.requestTimeout,
    });

    this.axios.interceptors.response.use((res: AxiosResponse) => {
      // Reset token if a 401 is thrown
      if (res.status === 401) {
        this.resetAccessToken();
      }
      return res;
    });
  }

  get baseURL() {
    return this.#baseURL;
  }

  public async getAuthorizationData({
    state,
    scope = ['email'],
    trackingParams,
  }: {
    state?: string;
    scope?: string[];
    trackingParams?: {
      utm_source: string;
      utm_medium: string;
      utm_campaign: string;
    };
  } = {}): Promise<AuthorizationData> {
    if (!this.redirectURI) {
      throw new Error('redirectURI is not set');
    }

    const stateID = state ?? uuid();

    const codeVerifier = await generateCodeVerifier();

    this.pendingStates[stateID] = {
      codeVerifier,
    };

    const url = await this.oauth.authorizationCode.getAuthorizeUri({
      redirectUri: this.redirectURI,
      state: stateID,
      codeVerifier,
      scope,
      ...(trackingParams && {
        extraParams: {
          utm_source: trackingParams.utm_source,
          utm_medium: trackingParams.utm_medium,
          utm_campaign: trackingParams.utm_campaign,
        },
      }),
    });

    // Deletes the state after 60 seconds
    setTimeout(() => {
      delete this.pendingStates[stateID];
    }, authorizationURLTimeout);

    return {
      url,
      state: stateID,
      scope,
    };
  }

  /**
   * Handle authorization response.
   *
   * @param urlString - URL, only the query string is required (e.g. `?code=xxxx&state=xxxxx`)
   */
  public async handleAuthorizationResponse(urlString: string) {
    const url = new URL(urlString, 'https://dummy.invalid');
    const state = url.searchParams.get('state') ?? undefined;
    const authorizationToken = url.searchParams.get('code');

    if (!authorizationToken) {
      if (url.searchParams.size === 0) {
        throw new Error(`URL ${JSON.stringify(urlString)} has no query parameters.`);
      }
      throw new RequiredParameterMissingError('token');
    }
    if (!state) {
      throw new RequiredParameterMissingError('state');
    }

    const pendingState = this.pendingStates[state];
    // Check if it is a valid auth request started by the extension
    if (!pendingState) {
      throw new OAuthError('invalid_state');
    }

    const { accessToken } = await this.oauth.authorizationCode.getTokenFromCodeRedirect(url, {
      codeVerifier: pendingState.codeVerifier,
      redirectUri: this.redirectURI,
      state,
    });

    await this.setAccessToken(accessToken);
  }

  /**
   * This method is used after authentication to save the access token.
   * It should be called by the plugins if any update to access token is made outside this lib.
   * @param accessToken - access token to use for requests
   */
  public async setAccessToken(accessToken: string): Promise<void> {
    this.axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    this.accessToken = accessToken;
  }

  public resetAccessToken(): void {
    this.accessToken = undefined;
    this.axios.defaults.headers.common['Authorization'] = `Bearer none`;
  }

  /**
   * This function will be called before every request to get the access token to use for the request.
   * It should be overridden by the plugins to return the access token.
   * @returns the access token to use for requests
   */
  public async getAccessToken(): Promise<string> {
    if (!this.accessToken) {
      throw new Error('No access token set. Please authenticate first.');
    }
    return this.accessToken;
  }

  public async getUser(): Promise<MCUser> {
    const user = await this.axios.get<MCUser>(URLS.rest.users.self);
    return user.data;
  }

  /**
   * Get AI credits information for the current user.
   *
   * @returns AI credits information including remaining credits and total limit.
   */
  public async getAICredits(): Promise<AICreditsUsage> {
    const response = await this.axios.get<AICreditsUsage>(URLS.rest.users.aiCreditUsage);
    return response.data;
  }

  public async getProjects(): Promise<MCProject[]> {
    const projects = await this.axios.get<MCProject[]>(URLS.rest.projects.list);
    return projects.data;
  }

  public async getDocuments(projectID: string): Promise<MCDocument[]> {
    const projects = await this.axios.get<MCDocument[]>(
      URLS.rest.projects.get(projectID).documents,
    );
    return projects.data;
  }

  public async createDocument(projectID: string) {
    const newDocument = await this.axios.post<MCDocument>(
      URLS.rest.projects.get(projectID).documents,
      {}, // force sending empty JSON to avoid triggering CSRF check
    );
    return newDocument.data;
  }

  public async getEditURL(
    document: Pick<MCDocument, 'documentID' | 'major' | 'minor' | 'projectID'>,
  ) {
    const url = `${this.#baseURL}${URLS.diagram(document).edit}`;
    return url;
  }

  public async getDocument(
    document: Pick<MCDocument, 'documentID'> | Pick<MCDocument, 'documentID' | 'major' | 'minor'>,
  ) {
    const { data } = await this.axios.get<MCDocument>(URLS.rest.documents.pick(document).self);
    return data;
  }

  /**
   * Update the given document.
   *
   * @param document - The document to update.
   */
  public async setDocument(
    document: Pick<MCDocument, 'documentID' | 'projectID'> & Partial<MCDocument>,
  ) {
    const { data } = await this.axios.put<{ result: 'ok' } | { result: 'failed'; error: unknown }>(
      URLS.rest.documents.pick(document).self,
      document,
    );

    if (data.result === 'failed') {
      throw new Error(
        `setDocument(${JSON.stringify({
          documentID: document.documentID,
        })} failed due to ${JSON.stringify(data.error)}`,
      );
    }
  }

  /**
   * Delete the given document.
   * @param documentID - The ID of the document to delete.
   * @returns Metadata about the deleted document.
   */
  public async deleteDocument(documentID: MCDocument['documentID']) {
    const deletedDocument = await this.axios.delete<Document>(
      URLS.rest.documents.pick({ documentID }).self,
      {}, // force sending empty JSON to avoid triggering CSRF check
    );
    return deletedDocument.data;
  }

  public async getRawDocument(
    document: Pick<MCDocument, 'documentID' | 'major' | 'minor'>,
    theme: 'light' | 'dark',
  ) {
    const raw = await this.axios.get<string>(URLS.raw(document, theme).svg);
    return raw.data;
  }

  /**
   * Repairs a broken Mermaid diagram using AI.
   *
   * @param request - The repair request containing diagram code and error message
   * @returns The repair response with repaired code and status
   * @throws {@link AICreditsLimitExceededError} if credits limit exceeded (HTTP 402)
   */
  public async repairDiagram(request: RepairDiagramRequest): Promise<RepairDiagramResponse> {
    try {
      const response = await this.axios.post<RepairDiagramResponse>(
        URLS.rest.openai.repair,
        request,
      );
      return response.data;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        error.response.status === 402
      ) {
        const axiosError = error as { response: { status: number; data?: unknown } };
        throw new AICreditsLimitExceededError(
          typeof axiosError.response.data === 'string'
            ? axiosError.response.data
            : 'AI credits limit exceeded',
        );
      }
      throw error;
    }
  }

  /**
   * Chat with Mermaid AI about a diagram.
   *
   * Sends a single user message to the Mermaid AI chat endpoint.  The backend
   * automatically fetches the full conversation history from the database
   * (when `documentChatThreadID` is provided), so callers never need to track
   * or resend previous messages.
   *
   * @param request - The chat request containing the user message and diagram context
   * @returns The AI response text and the chat thread ID
   * @throws {@link AICreditsLimitExceededError} if AI credits limit is exceeded (HTTP 402)
   */
  public async diagramChat(request: DiagramChatRequest): Promise<DiagramChatResponse> {
    const { message, documentID, code = '', documentChatThreadID } = request;

    // Send only the current user message. The backend will prepend the stored
    // conversation history when autoFetchHistory is true (see AIChatRequestData).
    const messages = [
      {
        id: uuid(),
        role: 'user' as const,
        content: message,
        experimental_attachments: [] as [],
      },
    ];

    const requestBody = {
      messages,
      code,
      documentID,
      documentChatThreadID,
      // parentID null: the backend already handles finding the correct parent
      parentID: null,
      // Tell the backend to fetch DB history and prepend it before calling the AI.
      autoFetchHistory: true,
    };

    try {
      // responseType: 'text' buffers the full stream body as a plain string so we
      // can parse the Vercel AI SDK data-stream format after the request completes.
      const response = await this.axios.post<string>(URLS.rest.openai.chat, requestBody, {
        responseType: 'text',
        timeout: 120_000,
      });

      const rawBody = response.data;
      const text = parseVercelAIStreamText(rawBody);
      const { documentChatThreadID: returnedThreadID } = parseVercelAIStreamData(rawBody);

      return {
        text,
        documentChatThreadID: returnedThreadID ?? documentChatThreadID,
        documentID,
      };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        (error as { response: { status: number } }).response.status === 402
      ) {
        const axiosError = error as { response: { status: number; data?: unknown } };
        throw new AICreditsLimitExceededError(
          typeof axiosError.response.data === 'string'
            ? axiosError.response.data
            : 'AI credits limit exceeded',
        );
      }
      throw error;
    }
  }
}
