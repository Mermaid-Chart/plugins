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
    const currentSlide = Office.context.document.getSelectedDataAsync(Office.CoercionType.SlideRange);

        // Insert the image
        Office.context.document.setSelectedDataAsync(diagram.base64Image, {
            coercionType: Office.CoercionType.Image,
            imageLeft: 50,  // X position (in points)
            imageTop: 50,   // Y position (in points)
            imageWidth: 100, // Width (in points)
            imageHeight: 100 // Height (in points)
        }, function (asyncResult) {
            if (asyncResult.status === Office.AsyncResultStatus.Failed) {
                console.error('Failed to insert image. Error:', asyncResult.error.message);
            } else {
                console.log('Image inserted successfully.');
            }
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