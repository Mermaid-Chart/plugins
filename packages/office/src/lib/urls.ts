import { C } from '$lib/constants';
import type { MCProject, MCDocument } from './mermaidChartApi';

/**
 * REST Cheatsheet
 * Endpoints SHOULD be in the format `/resources/:resourceID/subresources/:subresourceID`.
 * Resource names should be plural. (e.g.: dogs, cats, potatoes, teeth, presentations, etc.)
 *
 * `GET /resources` - Returns a list of all resources
 * `GET /resources/:resourceID` - Returns the specified resource
 * `POST /resources` - Creates a new resource
 * `PUT /resources/:resourceID` - Updates the specified resource completely
 * `PATCH /resources/:resourceID` - Updates the provided fields in the specified resource
 * `DELETE /resources/:resourceID` - Deletes the specified resource
 *
 * Follows standard:
 * `GET /diagrams` - Returns a list of all diagrams
 * `GET /diagrams/:diagramID` - Returns the diagram with given ID
 * `GET /projects/:projectID/diagrams` - Returns a list of all diagrams in the project with given ID
 * `DELETE /projects/:projectID` - Deletes the project with given ID
 * `GET /diagrams/:diagramID/presentations` - Returns a list of all presentations for the diagram with given ID
 * `GET /presentations/:presentationID/diagrams` - Returns the list of diagrams for the presentation with given ID
 *
 * Breaks standards:
 * `GET /diagrams/:projectID` - Returns the diagrams in a project with given ID. Should be `GET /projects/:projectID/diagrams`
 * `GET /presentations/:diagramID` - Returns the presentations for a diagram with given ID. Should be `GET /diagrams/:diagramID/presentations`
 * `GET /presentations/:projectID/diagrams` - Returns the diagrams used in presentations inside given project. Should be `GET /diagrams/:diagramID/presentations` or `GET /presentations/:presentationID/diagrams` depending on use case.
 * `POST /diagrams/:diagramID?action=delete` - Deletes the diagram with given ID. Should be `DELETE /diagrams/:diagramID`
 * `GET /diagrams/delete/:diagramID` - Deletes the diagram with given ID. Should be `DELETE /diagrams/:diagramID`
 * `DELETE /diagrams?id=:diagramID` - Deletes the diagram with given ID. Should be `DELETE /diagrams/:diagramID`
 */

/**
 * URLs for the app
 *
 * Standard
 * --------
 * ```ts
 * const route = {
 *  resources: {
 *   root: '/resources',
 * 	 pick: (resourceOrID: Pick<ResourceType, 'id'> | string) => {
 * 		const self = `${route.resources.root}/${getID(resourceOrID)}`;
 * 		return {
 * 			self,
 * 			dogs: `${self}/dogs`,
 * 			// if there is an in-depth sub-resource
 * 			bars: {
 * 				root: `${self}/bars`,
 * 				pick: (barOrID: Pick<BarType, 'id'> | string) => {
 * 					const barSelf = `${route.resources.root}/${id}/bars/${getID(barOrID)}`;
 * 					return {
 * 						self: barSelf,
 * 						edit: `${self}/edit`,
 * 						view: `${self}/view`,
 * 					};
 * 				}
 * 			}
 * 		}
 * 	 }
 *  }
 * }
 * ```
 *
 */

// MC Office add-in Rest API endpoints
const api = {
  documents: {
    pick: ({
      documentID,
      major,
      minor
    }: {
      documentID: string;
      major: string | number;
      minor: string | number;
    }) => {
      return `/api/diagram/${documentID}?major=${major}&minor=${minor}`;
    }
  },
  projects: {
    root: `/api/projects`,
    pick: (projectOrID: Pick<MCProject, 'id'> | string) => {
      const baseURL = `${URLS.api.projects.root}/${getID(projectOrID)}`;
      return {
        self: baseURL,
        documents: baseURL + '/documents'
      };
    }
  }
} as const;

// Mermaid Chart Rest API endpoints
const mcApi = {
  documents: {
    pick: ({
      documentID,
      major,
      minor
    }: {
      documentID: string;
      major?: string | number;
      minor?: string | number;
    }) => {
      const baseURL = `${C.MermaidChartBaseUrl}/rest-api/documents/${documentID}`;
      return {
        self: baseURL,
        withVersion: `${baseURL}?version=v${major ?? 0}.${minor ?? 1}`,
        presentations: `${baseURL}/presentations`
      };
    }
  },
  projects: {
    root: `${C.MermaidChartBaseUrl}/rest-api/projects`,
    pick: (projectOrID: Pick<MCProject, 'id'> | string) => {
      const baseURL = `${URLS.mcApi.projects.root}/${getID(projectOrID)}`;
      return {
        self: baseURL,
        documents: baseURL + '/documents'
      };
    }
  },
  users: {
    me: '/rest-api/users/me'
  },
} as const;

// Front end app endpoints
const app = {
  diagrams: {
    pick: (d: Pick<MCDocument, 'projectID' | 'documentID' | 'major' | 'minor'>) => {
      const base = `${C.MermaidChartBaseUrl}/app/projects/${d.projectID}/diagrams/${d.documentID}/version/v${d.major}.${d.minor}`;
      return {
        self: base,
        edit: base + '/edit',
        view: base + '/view'
      } as const;
    }
  },
  user: {
    settings: '/app/user/settings'
  },
};

export const URLS = {
  api,
  mcApi,
  app,
  raw: (documentID: string, major: string, minor: string) => {
    return `/api/diagram/${documentID}?major=${major}&minor=${minor}`;
  },
  mcRaw: (documentID: string, major: string, minor: string, theme: 'light' | 'dark') => {
    const base = `${C.MermaidChartBaseUrl}/raw/${documentID}?version=v${major}.${minor}&theme=${theme}&format=`;
    return {
      html: base + 'html',
      svg: base + 'svg',
      png: base + 'png'
    };
  },
  oAuth: {
    authorize:// (params: OAuthAuthorizationParams) =>
      `/oauth/authorize`,//?${new URLSearchParams(Object.entries(params)).toString()}`,
    token: `/oauth/token`
  },
  img: {
    logo: {
      icon: '/img/icon-logo.svg',
      full: '/img/logo-full-pink.svg'
    },
    projectCard: {
      square: '/img/project-card-image.png'
    }
  }
} as const;

const getID = (objectOrID: string | { id: string }): string => {
  return typeof objectOrID === 'string' ? objectOrID : objectOrID.id;
};
