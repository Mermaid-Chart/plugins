export interface InitParams {
  clientID: string;
  redirectURI?: string;
  baseURL?: string;
  requestTimeout?: number;
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
  /**
   * The Mermaid
   * [`application/vnd.mermaid`](https://www.iana.org/assignments/media-types/application/vnd.mermaid)
   * code for this diagram.
   */
  code?: string;
}

export interface AuthorizationData {
  url: string;
  state: string;
  scope: string[];
}

/**
 * Request parameters for repairing a diagram.
 */
export interface RepairDiagramRequest {
  /** The Mermaid diagram code that needs to be repaired */
  code: string;
  /** The error message from the broken diagram */
  error: string;
  /**
   * The diagram UUID to associate this repair with, or
   * `undefined` if it is not associated with a diagram (e.g. in the playground).
   */
  diagramDocumentID?: string;
  /**
   * The diagram ID associated with this repair.
   */
  diagramID?: string;
  /**
   * The user ID associated with this repair.
   */
  userID?: string;
}

/**
 * Response from repairing a diagram.
 * Matches OpenAIGenerationResult from collab.
 */
export interface RepairDiagramResponse {
  /**
   * The status of the repair: 'ok' if successful, 'fail' if not.
   * `ok` indicates that a valid mermaid code block was generated.
   * It may still fail to render.
   *
   * `fail` indicates that there were no exceptions/errors, but no valid
   * mermaid code block was generated.
   */
  result: 'ok' | 'fail';
  /**
   * Markdown message, that may contain a valid mermaid code block
   */
  code: string;
  /**
   * Whether the diagram repair was successful (only present for repair responses)
   */
  solved?: boolean;
}
