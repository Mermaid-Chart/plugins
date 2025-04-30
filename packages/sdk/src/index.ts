import { OAuth2Client, generateCodeVerifier } from '@badgateway/oauth2-client';
import type { AxiosInstance, AxiosResponse } from 'axios';
import defaultAxios from 'axios';
import { v4 as uuid } from 'uuid';
import { OAuthError, RequiredParameterMissingError } from './errors.js';
import type {
  AuthState,
  AuthorizationData,
  Document,
  InitParams,
  MCDocument,
  MCProject,
  MCUser,
} from './types.js';
import { URLS } from './urls.js';

const defaultBaseURL = 'https://www.mermaidchart.com'; // "http://127.0.0.1:5174"
const authorizationURLTimeout = 60_000;

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
    this.setBaseURL(baseURL || defaultBaseURL);
    if (redirectURI) {
      this.setRedirectURI(redirectURI);
    }
    if (requestTimeout) {
      this.requestTimeout = requestTimeout;
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
    utm_source,
    utm_medium,
    utm_campaign
  }: {
    state?: string;
    scope?: string[];
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  } = {}): Promise<AuthorizationData> {
    if (!this.redirectURI) {
      throw new Error('redirectURI is not set');
    }

    const stateID = state ?? uuid();

    const codeVerifier = await generateCodeVerifier();

    this.pendingStates[stateID] = {
      codeVerifier,
    };
    
    const extraParams: Record<string, string> = {};
    if (utm_source && utm_medium && utm_campaign) {
      extraParams.utm_source = utm_source;
      extraParams.utm_medium = utm_medium;
      extraParams.utm_campaign = utm_campaign;
    }

    const url = await this.oauth.authorizationCode.getAuthorizeUri({
      redirectUri: this.redirectURI,
      state: stateID,
      codeVerifier,
      scope,
      ...(Object.keys(extraParams).length > 0 && { extraParams }),
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
}
