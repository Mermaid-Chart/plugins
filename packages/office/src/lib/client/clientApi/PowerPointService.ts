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
      Office.context.document.setSelectedDataAsync(diagram.base64Image, { coercionType: Office.CoercionType.Image }, function (asyncResult) {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
          showUserMessage(
            //'Error generating image, or image not found. Please contact support',
            asyncResult.error.message,
            'error'
          );
        }
      });

      await context.sync();
      
      const selectedShapes = context.presentation.getSelectedShapes();
      selectedShapes.load('items');
      context.sync().then(function () {
        if (selectedShapes.items.length > 0) {
          const shape = selectedShapes.items[0];
          shape.tags.add(C.TokenSettingName, diagram.tag);
        }
      }).catch(function (error) {
        if (error instanceof OfficeExtension.Error) {
            console.error("Debug info: " + JSON.stringify(error.debugInfo));
        }
      });
    });
  }
  
  public async syncDiagrams(): Promise<void> {
    await PowerPoint.run(async (context) => {
        const slides = context.presentation.slides.load("items");
        await context.sync();
    
        for (let i = 0; i < slides.items.length; i++) {
          const currentSlide = slides.items[i];
          const shapes = currentSlide.shapes.load("items");
          await context.sync();
    
          for (let shapeIndex = 0; shapeIndex < shapes.items.length; shapeIndex++) {
            const currentShape = shapes.items[shapeIndex];
            const tags = currentShape.tags.load("key, value");
            await context.sync();
    
            for (let tagIndex = 0; tagIndex < tags.items.length; tagIndex++) {
              const currentTag = tags.items[tagIndex];
              
              if (currentTag.key === C.TokenSettingName.toUpperCase()) {
                currentShape.delete();
                await this.replaceExistingDiagram(currentTag.value);
              }
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