import { C } from '$lib/constants';
import { splitReferenceToken } from '$lib/utils';
import { loading } from '../stores/loading';
import { showUserMessage } from '../stores/messaging';
import { ContentControlsNotFoundError, DiagramNotFoundError, RefreshError } from '$lib/errors';
import type { Diagram } from './officeManager';
import { authStore } from '../stores/auth';
import { OfficeService } from './OfficeService';
import { sendBehaviorEvent } from '../util/sendEvents';

export class WordService extends OfficeService {
  authToken = authStore.accessKey();

  public getAuthToken(): string {
    return this.authToken;
  }
  
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
      
      const captionText = `${diagram.title} - last updated on ${diagram.updatedDate}`;
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

      const ccRange = contentControl.getRange(Word.RangeLocation.after);
      ccRange.select();

      ccRange.insertBreak(Word.BreakType.line, Word.InsertLocation.after)
      await context.sync();
    });
  }

  public async syncDiagrams() {
    const controlTagsToUpdate = await this.getContentControlTagsToUpdate().catch((error) => {
      if(error instanceof ContentControlsNotFoundError) {
        sendBehaviorEvent(
          'No diagrams found in document to sync', {
            area: 'sync-diagrams',
            eventID: `SYNC_DIAGRAM_WORD`
          });
        showUserMessage(
          'No diagrams found in document',
          'info'
        );
      }
    });

    if(controlTagsToUpdate) {
      try {
        for (const tag of controlTagsToUpdate) {
          await this.replaceExistingDiagram(tag);
        }
      } catch (error) {
        if(error instanceof RefreshError) {
          showUserMessage(
            'Error refreshing diagrams. Please contact support',
            'error'
          );
        }
      } finally {
        loading.setState(false, '');
      }
    }
  }

  private async getContentControlTagsToUpdate() {
    const tagList: string[] = [];

    try {
      await Word.run(async (context) => {
        const contentControls = context.document.contentControls;
        
        context.load(contentControls, 'tag');
        return context.sync().then(function() {
          for (let i = 0; i < contentControls.items.length; i++) {
            const tag = contentControls.items[i].tag;
            if(tag.startsWith(C.TokenSettingName)) {
              tagList.push(contentControls.items[i].tag);
            }
          }
        });
      });
    } catch {
      throw new Error('unknown error getting content controls');
    }

    if(tagList.length === 0) {
      throw new ContentControlsNotFoundError();
    }

    return tagList;
  }

  private async replaceExistingDiagram(tag: string) {
    const docDetails = splitReferenceToken(tag);
    const diagram = await this.mermaidChartApi.getDocument(docDetails.documentID);
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
        const range = contentControl.getRange();
        await context.sync();
        contentControl.delete(false);

        const newParagraph = range.insertParagraph('', Word.InsertLocation.after);
        const image = newParagraph.insertInlinePictureFromBase64(base64Image, Word.InsertLocation.end);
        image.hyperlink = editUrl;
        image.altTextTitle = tag;
  
        newParagraph.insertBreak(Word.BreakType.line, Word.InsertLocation.after)
          
        const captionText = `${diagram.title} - last updated on ${diagram.updatedAt.toLocaleString()}`;
        const caption = newParagraph.insertText(captionText, Word.InsertLocation.end);
        caption.font.italic = true;
        caption.font.color = "#888888";
        caption.font.size = 10;
        newParagraph.alignment = Word.Alignment.centered;

        await context.sync();

        const newContentControl = newParagraph.insertContentControl();
        newContentControl.set({
          title: diagram.title,
          tag: tag,
          appearance: Word.ContentControlAppearance.boundingBox
        });
      });
    } catch (error) {
      throw new RefreshError(`Error encountered while updating diagram: ${docDetails.documentID}`, error as Error);
    }
  }
}
