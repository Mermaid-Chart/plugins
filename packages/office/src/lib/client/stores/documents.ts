import { writable } from 'svelte/store';
import { getDiagramType } from '$lib/utils';
import { loading } from './loading';
import type { MCDocument, MermaidChart } from '$lib/mermaidChartApi';
import { showUserMessage } from './messaging';

interface MCDocumentDB {
  filterStr: string;
  documentIds: string[];
  documents: Record<string, MCDocument>;
}

const defaultDB: MCDocumentDB = {
  filterStr: '',
  documentIds: [],
  documents: {}
};

const fullDocumentList: MCDocument[] = [];

const addToFullList = (document: MCDocument) => {
  const existingDoc = fullDocumentList.find((doc) => doc.documentID === document.documentID);
  if (existingDoc) {
    return
  } else {
    fullDocumentList.push(document);
  }
}

function createDocumentStore() {
  const { subscribe, set, update } = writable(defaultDB);
  return {
    subscribe,
    fetchDocuments: async (projectIDList: string[], mermaidChartApi: MermaidChart) => {
      loading.setState(true, 'Getting diagrams...');
      const documents: MCDocument[] = [];
      
      for (const projectID of projectIDList) {
        try {
          const projectDocuments = await mermaidChartApi.getDocuments(projectID);
          documents.push(...projectDocuments);
        } catch {
          loading.setState(false, '');
          return showUserMessage(
            'Failed to load documents for project with ID: ' + projectID,
            'error');
        }
      }
      
      const res = update((documentDB) => {
        documentDB.documentIds = [];
        documentDB.documents = {};
        if(documents) {
          for (const document of documents) {
            if (document.code) {
              document.diagramType = getDiagramType(document.code);
              documentDB.documents[document.documentID] = document;
              documentDB.documentIds.push(document.documentID);
              addToFullList(document);
            }
          }
          documentDB.documentIds.sort((a, b) => doSort(a, b, 'updatedAt', documentDB.documents, 'asc'));
        }

        return { ...documentDB };
      });
      loading.setState(false, '');
      return res;
    },
    reset: () => set(defaultDB)
  };
}

function doSort(
  aId: string,
  bId: string,
  sortBy: string | undefined,
  documents: Record<string, MCDocument>,
  direction?: string
): number {
  switch (sortBy) {
    case 'updatedAt': {
      const a = documents[aId];
      const b = documents[bId];
      const aDate = new Date(a.updatedAt);
      const bDate = new Date(b.updatedAt);
      if (direction === undefined || direction === 'asc') {
        return aDate > bDate ? -1 : aDate < bDate ? 1 : 0;
      }

      return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
    }
  }

  return 0;
}

export const documentStore = createDocumentStore();
