import { loading } from '../stores/loading';
import { showUserMessage } from '../stores/messaging';
import type { Diagram } from './officeManager';
import { authStore } from '../stores/auth';
import { OfficeService } from './OfficeService';


export class PowerPointService extends OfficeService {
  authToken = authStore.accessKey();
  
  public async insertDiagram(diagram: Diagram): Promise<void> {
    throw new Error('not implemented');
  }
  public async syncDiagrams(): Promise<void> {
    throw new Error('not implemented');
  }
}