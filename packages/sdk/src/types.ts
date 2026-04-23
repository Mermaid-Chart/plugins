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

export interface AICreditsUsage {
  aiCredits: {
    remaining: number;
    total: number;
  };
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
 * Only the two diagram versions are sent; the server derives user plan and usage from the auth context provided by the access token.
 */
export interface PrSummaryRequest {
  originalDiagram: string;
  editedDiagram: string;
}

/**
 * Public response: suggested PR title and markdown description
 */
export interface PrSummaryResponse {
  title: string;
  description: string;
}

/**
 * Request parameters for chatting with the Mermaid AI about a diagram.
 */
export interface DiagramChatRequest {
  /** The user's chat message / question. */
  message: string;
  /** The MermaidChart document ID to associate the chat thread with. */
  documentID: string;
  /** Mermaid diagram code for context. Defaults to an empty string. */
  code?: string;
  /**
   * Existing chat thread ID to continue a conversation.
   * Returned from a previous diagramChat() call.
   * When provided, the backend automatically fetches the stored conversation
   * history from the database so the AI has full context.
   */
  documentChatThreadID?: string;
}

/**
 * Response from chatting with the Mermaid AI.
 */
export interface DiagramChatResponse {
  /** The AI response text, which may contain Mermaid code blocks. */
  text: string;
  /** Same as the document ID passed in the request. */
  documentID: string;
  /**
   * The chat thread ID created or used for this conversation.
   * Pass this back as documentChatThreadID in subsequent calls to continue the thread.
   */
  documentChatThreadID?: string;
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
