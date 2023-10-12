import type { Diagram } from './officeManager';
import { authStore } from '../stores/auth';
import { OfficeService } from './OfficeService';

export class OneNoteService extends OfficeService {
  authToken = authStore.accessKey();

  public getAuthToken(): string {
    return this.authToken;
  }
  
  public async insertDiagram(diagram: Diagram) {
    throw new Error('not implemented');
  }

  public async syncDiagrams() {
    throw new Error('not implemented');
  }
}