import { C } from '$lib/constants';
import { convertPngToBase64} from '$lib/utils';
import { loading } from '../stores/loading';
import { showUserMessage } from '../stores/messaging';
import type { MCDocument, MermaidChart } from '$lib/mermaidChartApi';
import { authStore } from '../stores/auth';
import { type OfficeService, NullService } from './OfficeService';
import { OneNoteService } from './OneNoteService';
import { PowerPointService } from './PowerPointService';
import { WordService } from './WordService';

export interface Diagram {
  base64Image: string;
  title: string;
  editUrl: string;
  tag: string;
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

  public async insertDiagram(mcDocument: MCDocument) {
    const referenceToken = `${C.TokenSettingName}:${mcDocument.documentID}:${mcDocument.major}:${mcDocument.minor}`;
    const editUrl = this.mermaidChartApi.getEditURL(mcDocument);
    const docTitle = mcDocument.title || 'Untitled document';
    let base64Image: string;    
    
    loading.setState(true, 'Generating image');
      
    try {
      base64Image = convertPngToBase64(await this.mermaidChartApi.getDocumentAsPng(mcDocument, 'light'));

      const diagram = {
        base64Image: base64Image,
        editUrl: editUrl,
        title: docTitle,
        tag: referenceToken
      };

      await this.officeService.insertDiagram(diagram);
    } catch (error) {
      showUserMessage(
        'Error generating image, or image not found. Please contact support',
        'error'
      );

      console.error('Error generating image', error);
    } finally {
      loading.setState(false, '');
    }
  }

  public async syncDiagramsInDocument() {
      try {
        loading.setState(true, 'Syncing diagrams in document...');
        await this.officeService.syncDiagrams();
      } catch (error) {
        showUserMessage(
          'Error refreshing diagrams. Please contact support',
          'error'
        );

        console.error('Unable to refresh diagrams', error);
      } finally {
        loading.setState(false, '');
      }
  }
}
