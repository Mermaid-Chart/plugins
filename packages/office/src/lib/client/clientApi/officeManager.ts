import { C } from '$lib/constants';
import { loading } from '../stores/loading';
import { showUserMessage } from '../stores/messaging';
import type { MCDocument, MermaidChart } from '$lib/mermaidChartApi';
import { type OfficeService, NullService } from './OfficeService';
import { OneNoteService } from './OneNoteService';
import { PowerPointService } from './PowerPointService';
import { WordService } from './WordService';
import { InvalidTokenError } from '$lib/errors';

export interface Diagram {
  base64Image: string;
  title: string;
  editUrl: string;
  tag: string;
  updatedDate: string;
}

export class OfficeManager {
  officeService: OfficeService;
  mermaidChartApi: MermaidChart;

  constructor(host: Office.HostType, api: MermaidChart) { 
    this.mermaidChartApi = api;
    switch(host) {
      case Office.HostType.Word: {
        this.officeService = new WordService(this.mermaidChartApi);
        break;
      }
      case Office.HostType.PowerPoint: {
        this.officeService = new PowerPointService(this.mermaidChartApi);
        break;
      }
      case Office.HostType.OneNote: {
        this.officeService = new OneNoteService(this.mermaidChartApi);
        break;
      }
      default: {
        this.officeService = new NullService(this.mermaidChartApi);
      }
    }
  }

  public getAuthToken(): string {
    return this.officeService.getAuthToken();
  }

  public async insertDiagram(mcDocument: MCDocument) {
    const referenceToken = `${C.TokenSettingName}:${mcDocument.documentID}:${mcDocument.major}:${mcDocument.minor}`;
    const editUrl = this.mermaidChartApi.getEditURL(mcDocument);
    const docTitle = mcDocument.title || 'Untitled document';
    let base64Image: string;    
    
    loading.setState(true, 'Generating image');
      
    try {
      base64Image = await this.mermaidChartApi.fetchDocumentAsBase64(mcDocument, 'light');

      const diagram = {
        base64Image: base64Image,
        editUrl: editUrl,
        title: docTitle,
        tag: referenceToken,
        updatedDate: mcDocument.updatedAt.toLocaleString()
      };

      await this.officeService.insertDiagram(diagram);
    } catch (error) {
        if(error instanceof InvalidTokenError) {
          showUserMessage(
            'Auth token invalid or not found, please make sure that you are authenticated, or contact support',
            'error'
          );
        } else {
          showUserMessage(
            'Error generating image, or image not found. Please contact support',
            'error'
          );
        }
    } finally {
      loading.setState(false, '');
    }
  }

  public async syncDiagramsInDocument() {
      try {
        loading.setState(true, 'Syncing diagrams in document...');
        await this.officeService.syncDiagrams();
      } catch {
        showUserMessage(
          'Error refreshing diagrams. Please contact support',
          'error'
        );
      } finally {
        loading.setState(false, '');
      }
  }
}
