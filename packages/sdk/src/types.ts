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

/**
 * MermaidChart diagram document.
 */
export type MCDocument = Document & DiagramDocument;

/**
 * MermaidChart document that may contain a diagram.
 */
export interface Document {
  projectID: string;
  title: string;
}

/**
 * MermaidChart diagram document, without any {@link Document} metadata.
 */
export interface DiagramDocument {
  /** The id of this diagram, required for `setDocument()` */
  id: string;
  /** The id of the document that this diagram is linked to. */
  documentID: string;
  major: number;
  minor: number;
}

export interface AuthorizationData {
  url: string;
  state: string;
  scope: string[];
}
