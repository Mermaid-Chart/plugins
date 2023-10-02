import { C } from '$lib/constants';
import { splitReferenceToken } from '$lib/utils';
import { loading } from '../stores/loading';
import { showUserMessage } from '../stores/messaging';
import { DiagramNotFoundError, RefreshError } from '$lib/errors';
import type { Diagram } from './officeManager';
import { authStore } from '../stores/auth';
import { OfficeService } from './OfficeService';

export class WordService extends OfficeService {
  authToken = authStore.accessKey();
  
  public async insertDiagram(diagram: Diagram) {
    OfficeExtension.config.extendedErrorLogging = true;
    await Word.run(async (context) => {
      const range = context.document.getSelection();
      range.insertBreak(Word.BreakType.line, Word.InsertLocation.after)
      
      const paragraph = range.insertParagraph('', 'After');
      const image = paragraph.insertInlinePictureFromBase64(diagram.base64Image, 'End');
      
      image.hyperlink = diagram.editUrl;
      image.altTextTitle = diagram.tag;
  
      paragraph.insertBreak(Word.BreakType.line, Word.InsertLocation.after)
      
      const captionText = `${diagram.title}`;
      const caption = paragraph.insertText(captionText, Word.InsertLocation.end);
      caption.font.italic = true;
      caption.font.color = "#888888";
      caption.font.size = 10;
      paragraph.alignment = Word.Alignment.centered;
      
      await context.sync();
  
      const contentControl = paragraph.insertContentControl();
      contentControl.set({
        title: diagram.title,
        tag: diagram.tag,
        appearance: Word.ContentControlAppearance.boundingBox
      });
    });
  }

  public async syncDiagrams() {
    const contentControlsToUpdate = await this.getContentControls();

    try {
      for (const control of contentControlsToUpdate) {
        await this.insertNewDiagram(control.tag);
      }
    } catch (error) {
      showUserMessage(
        'Error refreshing diagrams. Please contact support',
        'error'
      );

      console.error('Unable to refresh diagrams', error);
    } finally {
      loading.setState(false, '');
    }
  }

  private async getContentControls() {
    const contentControlsToUpdate: Word.ContentControl[] = [];

    try {
      await Word.run(async (context) => {
        const contentControls = context.document.contentControls.load("items");
        
        return context.sync()
        .then(() => {
            for (const contentControl of contentControls.items) {
              if(contentControl.tag.startsWith(C.TokenSettingName)) {
                contentControlsToUpdate.push(contentControl);
              }
          } 
        })
      });
    } catch (error) {
      console.error('unknown error getting content controls', error);
      throw new Error('unknown error getting content controls');
    }

    return contentControlsToUpdate;
  }

  private async insertNewDiagram(tag: string) {
    const docDetails = splitReferenceToken(tag);
    const base64Image = await this.mermaidChartApi.fetchDocumentAsBase64(docDetails, 'light');

    try {
      await Word.run(async (context) => {
        const contentControl = context.document.contentControls.getByTag(tag).getFirst();
        contentControl.load();
        await context.sync();
        const existingDiagram = contentControl.inlinePictures.getFirstOrNullObject();

        if(!existingDiagram) {
          throw(new DiagramNotFoundError(`Unable to find diagram with id: ${docDetails.documentID} in this document`));
        }

        existingDiagram.load();
        await context.sync();
        
        const editUrl = existingDiagram.hyperlink;
        const docTitle = contentControl.title;
        const range = contentControl.getRange();
        await context.sync();
        contentControl.delete(false);

        const newParagraph = range.insertParagraph('', Word.InsertLocation.after);
        const image = newParagraph.insertInlinePictureFromBase64(base64Image, Word.InsertLocation.end);
        image.hyperlink = editUrl;
        image.altTextTitle = tag;
  
        newParagraph.insertBreak(Word.BreakType.line, Word.InsertLocation.after)
          
        const captionText = docTitle;
        const caption = newParagraph.insertText(captionText, Word.InsertLocation.end);
        caption.font.italic = true;
        caption.font.color = "#888888";
        caption.font.size = 10;
        newParagraph.alignment = Word.Alignment.centered;

        await context.sync();

        const newContentControl = newParagraph.insertContentControl();
        newContentControl.set({
          title: docTitle,
          tag: tag,
          appearance: Word.ContentControlAppearance.boundingBox
        });
      });
    } catch (error) {
      console.error(`Error encountered when refreshing diagram: ${docDetails.documentID}`, error);
      throw new RefreshError(`Error encountered when refreshing diagram: ${docDetails.documentID}`);
    }
  }
}
