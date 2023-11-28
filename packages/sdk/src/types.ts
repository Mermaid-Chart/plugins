export interface InitParams {
  clientID: string;
  redirectURI?: string;
  baseURL?: string;
}

export interface OAuthAuthorizationParams {
  response_type: 'code';
  client_id: string;
  redirect_uri: string;
  code_challenge_method: 'S256';
  code_challenge: string;
  state: string;
  scope: string;
}

export interface AuthState {
  codeVerifier: string;
}

export interface MCUser {
  fullName: string;
  emailAddress: string;
}

export interface MCProject {
  id: string;
  title: string;
}

export interface MCDocument {
  documentID: string;
  projectID: string;
  major: number;
  minor: number;
  title: string;
}

export interface AuthorizationData {
  url: string;
  state: string;
  scope: string[];
}
