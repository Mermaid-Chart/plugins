import { accessProtectedResource, baseURL } from './Api';
import { URLS } from './Common';
import { getDocumentID } from './Links';

function getImageByDocumentID(documentID: string) {
  const resp = accessProtectedResource(
    URLS.raw(
      {
        documentID,
      },
      'light',
    ).png,
  );

  if (resp) {
    return resp.getBlob();
  }
}

function scaleImageAndSetURL(
  image: GoogleAppsScript.Document.InlineImage,
  documentID: string,
  { width, height }: { width: number; height: number },
) {
  const imageHeight = image.getHeight();
  const imageWidth = image.getWidth();

  const editURL =
    baseURL +
    URLS.shortDiagram({
      documentID,
    }) +
    '#inlineImage=true';
  image.setLinkUrl(editURL);

  const scalingFactor = Math.min(width / imageWidth, height / imageHeight);
  if (scalingFactor < 1) {
    image.setWidth(imageWidth * scalingFactor);
    image.setHeight(imageHeight * scalingFactor);
  }
}

export function injectImageIntoDocument(e: { parameters: { documentID: string } }) {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const documentID = e.parameters.documentID ?? '77ce74e1-c19e-4df4-b808-0c8b818ef013';
  // body.getChild(0).asParagraph().appendText(JSON.stringify(e, null, 4));

  const blob = getImageByDocumentID(documentID);
  if (!blob) {
    return;
  }

  const image =
    doc.getCursor()?.insertInlineImage(blob) ??
    body.getChild(0).asParagraph().insertInlineImage(0, blob);

  const pageWidth = body.getPageWidth();
  const pageHeight = body.getPageHeight();
  scaleImageAndSetURL(image, documentID, { width: pageWidth, height: pageHeight });
}

export function refreshAllImagesInDocument() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const images = body.getImages();
  for (const image of images) {
    const linkUrl = image.getLinkUrl();
    if (!linkUrl || !linkUrl.startsWith(baseURL)) {
      continue;
    }
    const documentID = getDocumentID(linkUrl);
    if (!documentID) {
      continue;
    }

    const blob = getImageByDocumentID(documentID);
    if (!blob) {
      return;
    }

    const childIndex = image.getParent().getChildIndex(image);
    const newImage = image.getParent().asParagraph().insertInlineImage(childIndex, blob);
    scaleImageAndSetURL(newImage, documentID, {
      width: image.getWidth(),
      height: image.getHeight(),
    });
    image.removeFromParent();
  }
}
