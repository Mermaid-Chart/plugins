import { writable } from 'svelte/store';
import { getProjectDocuments } from '../clientApi/projectManager';
import { getDiagramType } from '$lib/utils';
import { loading } from './loading';
import type { MCDocument } from '$lib/mermaidChartApi';

interface MCDocumentDB {
  filterStr: string;
  list: string[];
  documents: Record<string, MCDocument>;
}

const defaultDB: MCDocumentDB = {
  filterStr: '',
  list: [],
  documents: {}
};

function createDocumentStore() {
  const { subscribe, set, update } = writable(defaultDB);
  return {
    subscribe,
    fetchDocuments: async (projectID: string) => {
      loading.setState(true, 'Getting diagrams...');
      const documents = await getProjectDocuments(projectID);
      
      const res = update((documentDB) => {
        documentDB.list = [];
        documentDB.documents = {};
        if(documents) {
          for (const document of documents) {
            if (document.code) {
              document.diagramType = getDiagramType(document.code);
              documentDB.documents[document.documentID] = document;
              documentDB.list.push(document.documentID);
            }
          }
          documentDB.list.sort((a, b) => doSort(a, b, 'updatedAt', documentDB.documents, 'asc'));
        }
        return { ...documentDB };
      });
      loading.setState(false, '');
      return res;
    },
    fetchAllDocuments: async (projectIDList: string[]) => {
      loading.setState(true, 'Getting diagrams...');
      const documents: MCDocument[] = [];
      
      for (const projectID of projectIDList) {
        const projectDocuments = await getProjectDocuments(projectID);
        documents.push(...projectDocuments);
      }
      
      const res = update((documentDB) => {
        documentDB.list = [];
        documentDB.documents = {};
        if(documents) {
          for (const document of documents) {
            if (document.code) {
              document.diagramType = getDiagramType(document.code);
              documentDB.documents[document.documentID] = document;
              documentDB.list.push(document.documentID);
            }
          }
          documentDB.list.sort((a, b) => doSort(a, b, 'updatedAt', documentDB.documents, 'asc'));
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
