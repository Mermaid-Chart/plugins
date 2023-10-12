import type { MermaidChart } from '$lib/mermaidChartApi';
import type { Diagram } from './officeManager';

export abstract class OfficeService {
  mermaidChartApi: MermaidChart;
    constructor(api: MermaidChart) {
      this.mermaidChartApi = api;
  }

  abstract authToken: string;
  abstract getAuthToken(): string;
  abstract insertDiagram(diagram: Diagram): Promise<void>;
  abstract syncDiagrams(): Promise<void>;
}

export class NullService extends OfficeService {
  authToken = '';
  public getAuthToken(): string {
    return this.authToken;
  }
  
  public insertDiagram(diagram: Diagram): Promise<void> {
    throw new Error('not implemented');
  }
  public syncDiagrams(): Promise<void> {
    throw new Error('not implemented');
  }
}

