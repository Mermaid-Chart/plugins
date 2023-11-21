import type { MCDocument } from './types.js';

export const URLS = {
  oauth: {
    authorize: `/oauth/authorize`,
    token: `/oauth/token`,
  },
  rest: {
    users: {
      self: `/rest-api/users/me`,
    },
    projects: {
      list: `/rest-api/projects`,
      get: (projectID: string) => {
        return {
          documents: `/rest-api/projects/${projectID}/documents`,
        };
      },
    },
  },
  raw: (document: Pick<MCDocument, 'documentID' | 'major' | 'minor'>, theme: 'light' | 'dark') => {
    const base = `/raw/${document.documentID}?version=v${document.major}.${document.minor}&theme=${theme}&format=`;
    return {
      html: base + 'html',
      svg: base + 'svg',
    };
  },
  diagram: (d: Pick<MCDocument, 'projectID' | 'documentID' | 'major' | 'minor'>) => {
    const base = `/app/projects/${d.projectID}/diagrams/${d.documentID}/version/v${d.major}.${d.minor}`;
    return {
      self: base,
      edit: base + '/edit',
      view: base + '/view',
    } as const;
  },
} as const;
