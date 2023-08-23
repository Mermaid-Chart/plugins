import pick from 'lodash-es/pick';

export const splitVersion = (versionString: string | null) => {
  if (!versionString) {
    versionString = 'v0.1';
  }
  const [version, revision] = versionString.slice(1).split('.');
  return { version: Number.parseInt(version), revision: Number.parseInt(revision) };
};

export const getTheme = (theme?: string | null) => {
  return theme === 'dark' ? 'dark' : 'light';
};

export const sanitizeObject = <T extends object>(subject: T, fields: (keyof T)[]) => {
  return pick(subject, fields);
};

export const isEmpty = (obj: unknown): obj is Record<never, never> => typeof obj === 'object' && obj !== null && Object.keys(obj).length === 0;

export const getDiagramType = (text: string): string => {
  const possibleDiagramTypes = [
    'classDiagram',
    'erDiagram',
    'sequenceDiagram',
    'flowchart',
    'flowchart-v2',
    'timeline',
    'gantt',
    'gitGraph',
    'graph',
    'journey',
    'pie',
    'mindmap',
    'quadrantChart',
    'stateDiagram'
  ];
  if (!text) {
    return '';
  }
  const firstLine = text
    .replace(/^\s*%%.*\n/g, '\n')
    .trimStart()
    .split(' ')[0]
    .toLowerCase();
  const detectedDiagram = possibleDiagramTypes.find((d) => firstLine.includes(d.toLowerCase()));
  if (detectedDiagram === 'graph' || detectedDiagram === 'flowchart-v2') {
    return 'flowchart';
  }
  return detectedDiagram || '';
};

export const fetchBase64Image = async (url: string, authToken:string) : Promise<string> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${authToken}`
    },
    mode: 'no-cors',})
  const blob = await response.blob()
  const imageBase64 = await blobToBase64(blob);
  return imageBase64.replace('data:image/png;base64,', '');
}

const blobToBase64 = async (blob: Blob) : Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result?.toString() || ''));
    reader.readAsDataURL(blob)
  })
}

export const splitReferenceToken = (tag: string) => {
  const splitValues = tag.split(':');

  return {
    documentID: splitValues[1],
    major: splitValues[2],
    minor: splitValues[3]
  }
}


export const getAuthTokenFromHeader = (headers: Headers) => {
  const authHeader = headers.get('authorization');
  if (!authHeader || !authHeader?.startsWith('Bearer ')) {
    throw new Error('No auth header');
  }
  return authHeader.slice(7);
}