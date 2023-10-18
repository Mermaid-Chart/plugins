import { C } from '$lib/constants';
import { splitReferenceToken } from '$lib/utils';
import { DiagramNotFoundError, RefreshError } from '$lib/errors';
import type { Diagram } from './officeManager';
import { authStore } from '../stores/auth';
import { OfficeService } from './OfficeService';

export class ExcelService extends OfficeService {
  authToken = authStore.accessKey();

  public getAuthToken(): string {
    return this.authToken;
  }
  
  public async insertDiagram(diagram: Diagram) {
    await Excel.run(async (context) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet();
      
      const image = worksheet.shapes.addImage(diagram.base64Image);
      image.scaleWidth(.65, Excel.ShapeScaleType.originalSize)
      image.name = diagram.title;
      image.altTextDescription = diagram.tag;
      await context.sync();
  });
}

  public async syncDiagrams(): Promise<void> {
    await Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets.load('items');
      await context.sync();
      for(let worksheetIndex = 0; worksheetIndex < worksheets.items.length; worksheetIndex++) {
        const sheet = worksheets.items[worksheetIndex];
        const shapes = sheet.shapes.load("name,shapeType");
        
        await context.sync();

        for (let shapeIndex = 0; shapeIndex < shapes.items.length; shapeIndex++) {
          const shape = shapes.items[shapeIndex].load('altTextDescription');
          await context.sync();
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
    const document = await this.mermaidChartApi.getDocument(docDetails.documentID);
    if(!document) {
      throw new DiagramNotFoundError(docDetails.documentID);
    }

    const base64Image = await this.mermaidChartApi.fetchDocumentAsBase64(docDetails, 'light');

    const diagram = {
      base64Image: base64Image,
      editUrl: this.mermaidChartApi.getEditURL(document),
      title: document.title,
      tag: tag,
      updatedDate: document.updatedAt.toLocaleString()
    };
    
    try {
      await this.insertDiagram(diagram);
    } catch (error) {
      throw new RefreshError(`Error encountered while updating diagram: ${docDetails.documentID}`, error as Error);
    }
  }
}