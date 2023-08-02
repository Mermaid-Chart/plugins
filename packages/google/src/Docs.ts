import { accessProtectedResource, baseURL } from './Api';
import { URLS } from './Common';

export function injectImageIntoDocument(e: { parameters: { documentID: string } }) {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const documentID = e.parameters.documentID ?? '77ce74e1-c19e-4df4-b808-0c8b818ef013';
  // body.getChild(0).asParagraph().appendText(JSON.stringify(e, null, 4));

  const resp = accessProtectedResource(
    URLS.raw(
      {
        documentID
      },
      'light'
    ).png
  );

  if (!resp) {
    return;
  }

  const image =
    doc.getCursor()?.insertInlineImage(resp.getBlob()) ??
    body.getChild(0).asParagraph().insertInlineImage(0, resp.getBlob());

  const imageHeight = image.getHeight();
  const imageWidth = image.getWidth();

  const editURL =
    baseURL +
    URLS.shortDiagram({
      documentID
    }) +
    '#inlineImage=true';
  image.setLinkUrl(editURL);

  const pageWidth = body.getPageWidth();
  const pageHeight = body.getPageHeight();

  const scalingFactor = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
  const scaling = scalingFactor > 1 ? 1 : scalingFactor;

  image.setWidth(imageWidth * scaling);
  image.setHeight(imageHeight * scaling);
}
