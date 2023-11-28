import { C } from '$lib/constants';
import { splitReferenceToken } from '$lib/utils';
import { DiagramNotFoundError, RefreshError } from '$lib/errors';
import { showUserMessage } from '../stores/messaging';
import type { Diagram } from './officeManager';
import { authStore } from '../stores/auth';
import { OfficeService } from './OfficeService';
export class PowerPointService extends OfficeService {
  authToken = authStore.accessKey();

  public getAuthToken(): string {
    return this.authToken;
  }
  
  public async insertDiagram(diagram: Diagram): Promise<void> {
    await PowerPoint.run(async (context) => {
      Office.context.document.setSelectedDataAsync(diagram.base64Image, {coercionType: Office.CoercionType.Image }, function (asyncResult) {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
          showUserMessage(
            //'Error generating image, or image not found. Please contact support',
            asyncResult.error.message,
            'error'
          );
        }
      });

      await context.sync();
      // after inserting an image with setSelectedDataAsync, the shape will be the selected item
      const selectedShapes = context.presentation.getSelectedShapes().load('items');
      await context.sync();
      if(selectedShapes.items.length > 0) {
        const shape = selectedShapes.items[0];
        shape.tags.add(C.TokenSettingName, diagram.tag);
      }      
    });
  }

  public async syncDiagrams(): Promise<void> {
    OfficeExtension.config.extendedErrorLogging = true;
    await PowerPoint.run(async (context) => {
      const presentation = context.presentation;
      const slides = presentation.slides.load("items");
      await context.sync();

      for(let slideIndex = 0; slideIndex < slides.items.length; slideIndex++) {
        const slide = slides.items[slideIndex];
        const shapes = slide.shapes;
        shapes.load("items/tags");
        await context.sync();

        for (let shapeIndex = 0; shapeIndex < shapes.items.length; shapeIndex++) {
          const shape = shapes.items[shapeIndex];
          shape.load('tags');
          await context.sync();
          
          try{
            const diagramTag = shape.tags.getItem(C.TokenSettingName);
            await context.sync();
            if(diagramTag) {
              shape.delete();
              await this.replaceExistingDiagram(diagramTag.value);
            }
          } catch (error) {
            throw new RefreshError(`Error encountered while updating diagrams:`, error as Error);
          }
        }
      }
    });
  }

  private async replaceExistingDiagram(tag: string) {
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