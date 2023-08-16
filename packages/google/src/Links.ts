import { accessProtectedResource } from './Api';
import { btoa } from 'js-base64';
import { URLS } from './Common';

const rawRegex = /\/raw\/([a-z0-9-]+)\?/;
const appRegex = /\/app\/projects\/[a-z0-9-]+\/diagrams\/([a-z0-9-]+)\/version\/v0.1\/edit/;
const diagramsRegex = /\/app\/diagrams\/([a-z0-9-]+)/;
const regexes = [diagramsRegex, rawRegex, appRegex];

export function getDocumentID(url: string) {
  for (const regex of regexes) {
    const match = url.match(regex);
    if (match) {
      return match[1];
    }
  }
}

export function diagramLinkPreview(event: any) {
  // If the event object URL matches a specified pattern for support case links.
  if (!event.docs.matchedUrl.url) {
    return;
  }
  const documentID = getDocumentID(event.docs.matchedUrl.url);
  if (!documentID) {
    return;
  }

  // Builds a preview card with the case ID, title, and description
  const caseHeader = CardService.newCardHeader().setTitle(`Mermaid Diagram ${documentID}`);

  const svgCode = accessProtectedResource(URLS.raw({ documentID }, 'light').svg)?.getContentText();
  if (!svgCode) {
    return;
  }

  const image = CardService.newImage().setImageUrl('data:image/svg+xml;base64,' + btoa(svgCode));

  const button = CardService.newTextButton()
    .setText('Open in Mermaid Chart')
    .setOpenLink(CardService.newOpenLink().setUrl(event.docs.matchedUrl.url));

  // Returns the card.
  // Uses the text from the card's header for the title of the smart chip.
  return CardService.newCardBuilder()
    .setHeader(caseHeader)
    .addSection(CardService.newCardSection().addWidget(image))
    .addSection(CardService.newCardSection().addWidget(button))
    .build();
}
