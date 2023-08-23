import { URLS } from '$lib/urls';
import { C } from '$lib/constants';
import { fetchBase64Image} from '$lib/utils';
import { loading } from '../stores/loading';
import { showUserMessage } from '../stores/messaging';
import type { MCDocument } from '$lib/mermaidChartApi';
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

  constructor(host: Office.HostType) { 
    switch(host) {
      case Office.HostType.Word: {
        this.officeService = new WordService();
        break;
      }
      case Office.HostType.PowerPoint: {
        this.officeService = new PowerPointService();
        break;
      }
      case Office.HostType.OneNote: {
        this.officeService = new OneNoteService();
        break;
      }
      default: {
        this.officeService = new NullService();
      }
    }
  }

  public async insertDiagram(mcDocument: MCDocument) {
    const authToken = authStore.accessKey();
    const referenceToken = `${C.TokenSettingName}:${mcDocument.documentID}:${mcDocument.major}:${mcDocument.minor}`;
    const editUrl = URLS.app.diagrams.pick(mcDocument).edit;
    const docTitle = mcDocument.title || 'Untitled document';
    let base64Image: string;    
    
    loading.setState(true, 'Generating image');
      
    try {
      base64Image = await fetchBase64Image(URLS.raw(mcDocument.documentID, mcDocument.major, mcDocument.minor), authToken);

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
        loading.setState(true, 'Syncing digrams in document...');
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
