import { loading } from '../stores/loading';
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
            'Error generating image, or image not found. Please contact support',
            'error'
          );
      }
    });
    
    await context.sync();
  });

    
        
  }

  public async syncDiagrams(): Promise<void> {
    // for (const slide of Office.context.document.) {
    //     // Iterate over shapes in the slide
    //     for (let shape of slide.shapes) {
    //         // Check if the shape is an image with the altTextTitle set to "ExternalImage"
    //         if (shape.type === "Image" && shape.altTextTitle === "ExternalImage") {
    //             // Update the image data
    //             shape.imageData = latestImageBase64;
    //         }
    //     }
    // }
  }
}