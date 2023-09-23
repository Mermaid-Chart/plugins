export const URLS = {
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
  raw: (
    document: Pick<MCDocument, 'documentID'> & {
      major?: string;
      minor?: string;
    },
    theme: 'light' | 'dark',
  ) => {
    const base = `/raw/${document.documentID}?version=v${document.major ?? 0}.${
      document.minor ?? 1
    }&theme=${theme}&format=`;
    return {
      html: base + 'html',
      svg: base + 'svg',
      png: base + 'png',
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
  shortDiagram: (d: Pick<MCDocument, 'documentID'>) => {
    return `/app/diagrams/${d.documentID}`;
  },
  image: {
    logo: {
      square: {
        ['48']: 'https://www.mermaidchart.com/img/mermaid-chart-48.png',
      },
    },
  },
} as const;

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
  major: string;
  minor: string;
  title: string;
  updatedAt: string;
}

export const CacheKeys = {
  projects: 'mc_projects',
  documents: (projectID: string) => `mc_documents_${projectID}`,
} as const;

export const TimeInSeconds = {
  minute: 60,
  hour: 60 * 60,
  day: 60 * 60 * 24,
  minutes: (n: number) => n * TimeInSeconds.minute,
  hours: (n: number) => n * TimeInSeconds.hour,
  days: (n: number) => n * TimeInSeconds.day,
} as const;
