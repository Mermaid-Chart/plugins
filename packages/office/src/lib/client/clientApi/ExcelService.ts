import { C } from '$lib/constants';
import { splitReferenceToken } from '$lib/utils';
import { DiagramNotFoundError, RefreshError } from '$lib/errors';
import type { Diagram } from './officeManager';
import { authStore } from '../stores/auth';
import { OfficeService } from './OfficeService';


export class PowerPointService extends OfficeService {
  authToken = authStore.accessKey();

  public getAuthToken(): string {
    return this.authToken;
  }
  
  public async insertDiagram(diagram: Diagram) {
    await Excel.run(async (context) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet();
      const image = worksheet.shapes.addImage(diagram.base64Image);
      image.name = diagram.title;
      image.altTextDescription = diagram.tag;
      await context.sync();
  });
}

  public async syncDiagrams(): Promise<void> {
    await Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets;
      await context.sync();
      for(let worksheetIndex = 0; worksheetIndex < worksheets.items.length; worksheetIndex++) {
        const sheet = worksheets.items[worksheetIndex];
        const shapes = sheet.shapes.load("name,shapeType");
        
        await context.sync();

        for (let shapeIndex = 0; shapeIndex < shapes.items.length; shapeIndex++) {
          const shape = shapes.items[shapeIndex];
          const tag = shape.altTextDescription;
          if (tag.startsWith(C.TokenSettingName)) {
            shape.delete();
            await this.replaceExistingDiagram(sheet, tag);
          }
        }
      }
      
      await context.sync();
    })
  }

  private async replaceExistingDiagram(worksheet: Excel.Worksheet, tag: string) {
    const docDetails = splitReferenceToken(tag);
    const diagram = await this.mermaidChartApi.getDocument(docDetails.documentID);
    if(!diagram) {
      throw new DiagramNotFoundError(docDetails.documentID);
    }
    
    const base64Image = await this.mermaidChartApi.fetchDocumentAsBase64(docDetails, 'light');

    try {
      await Excel.run(async (context) => {
        const image = worksheet.shapes.addImage(base64Image);
        image.name = diagram.title;
        image.altTextDescription = tag;
        await context.sync();

      });
    } catch (error) {
      throw new RefreshError(`Error encountered while updating diagram: ${docDetails.documentID}`, error as Error);
    }
  }
}