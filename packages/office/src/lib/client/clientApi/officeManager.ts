import { C } from '$lib/constants';
import { loading } from '../stores/loading';
import { showUserMessage } from '../stores/messaging';
import type { MCDocument, MermaidChart } from '$lib/mermaidChartApi';
import { type OfficeService, NullService } from './OfficeService';
import { PowerPointService } from './PowerPointService';
import { WordService } from './WordService';
import { InvalidTokenError } from '$lib/errors';
import { ExcelService } from './ExcelService';
import { sendBehaviorEvent } from '../util/sendEvents';

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
  host: Office.HostType;

  constructor(host: Office.HostType, api: MermaidChart) { 
    this.mermaidChartApi = api;
    this.host = host;
    switch(host) {
      case Office.HostType.Word: {
        this.officeService = new WordService(this.mermaidChartApi);
        break;
      }
      case Office.HostType.PowerPoint: {
        this.officeService = new PowerPointService(this.mermaidChartApi);
        break;
      }
      case Office.HostType.Excel: {
        this.officeService = new ExcelService(this.mermaidChartApi);
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
      sendBehaviorEvent(
        'Insert PNG of diagram', {
          area: 'insert-diagram',
          eventID: `DIAGRAM_INSERT_${this.host.toString().toUpperCase()}`
        });
    } catch (error) {
        if(error instanceof InvalidTokenError) {
          sendBehaviorEvent(
            'Auth token invalid or not found', {
              area: 'insert-diagram',
              eventID: `DIAGRAM_INSERT_${this.host.toString().toUpperCase()}`
            });
          showUserMessage(
            'Auth token invalid or not found, please make sure that you are authenticated, or contact support',
            'error'
          );
        } else {
          sendBehaviorEvent(
            'Error generating PNG', {
              area: 'insert-diagram',
              eventID: `DIAGRAM_INSERT_${this.host.toString().toUpperCase()}`
            });
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
        sendBehaviorEvent(
          'Sync diagrams with mermaid chart', {
            area: 'sync-diagrams',
            eventID: `SYNC_DIAGRAM_${this.host.toString().toUpperCase()}`
          });
      } catch {
        sendBehaviorEvent(
          'Sync diagrams failed', {
            area: 'insert-diagram',
            eventID: `SYNC_DIAGRAM_${this.host.toString().toUpperCase()}`
          });
        showUserMessage(
          'Error refreshing diagrams. Please contact support',
          'error'
        );
      } finally {
        loading.setState(false, '');
      }
  }
}
