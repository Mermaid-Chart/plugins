/**
 * Creates a card with an image of a cat, overlayed with the text.
 * @param {String} text The text to overlay on the image.
 * @param {Boolean} isHomepage True if the card created here is a homepage;
 *      false otherwise. Defaults to false.
 * @return {CardService.Card} The assembled card.
 */
export function createCatCard(
  text: string,
  isHomepage = false
): GoogleAppsScript.Card_Service.Card {
  // Use the "Cat as a service" API to get the cat image. Add a "time" URL
  // parameter to act as a cache buster.
  const now = new Date();
  // Replace forward slashes in the text, as they break the CataaS API.
  const caption = text.replace(/\//g, ' ');
  const imageUrl = Utilities.formatString(
    'https://cataas.com/cat/says/%s?time=%s',
    encodeURIComponent(caption),
    now.getTime()
  );
  const image = CardService.newImage().setImageUrl(imageUrl).setAltText('Meow');

  // Create a button that changes the cat image when pressed.
  // Note: Action parameter keys and values must be strings.
  const action = CardService.newAction()
    .setFunctionName('onChangeCat')
    .setParameters({ text: text, isHomepage: isHomepage.toString() });
  const button = CardService.newTextButton()
    .setText('Change cat')
    .setOnClickAction(action)
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED);
  const buttonSet = CardService.newButtonSet().addButton(button);

  // Create a footer to be shown at the bottom.
  const footer = CardService.newFixedFooter().setPrimaryButton(
    CardService.newTextButton()
      .setText('Powered by cataas.com')
      .setOpenLink(CardService.newOpenLink().setUrl('https://cataas.com'))
  );

  // Assemble the widgets and return the card.
  const section = CardService.newCardSection().addWidget(image).addWidget(buttonSet);
  const card = CardService.newCardBuilder().addSection(section).setFixedFooter(footer);

  if (!isHomepage) {
    // Create the header shown when the card is minimized,
    // but only when this card is a contextual card. Peek headers
    // are never used by non-contexual cards like homepages.
    const peekHeader = CardService.newCardHeader()
      .setTitle('Contextual Cat')
      .setImageUrl('https://www.gstatic.com/images/icons/material/system/1x/pets_black_48dp.png')
      .setSubtitle(text);
    card.setPeekCardHeader(peekHeader);
  }

  return card.build();
}

/**
 * Callback for the "Change cat" button.
 * @param {Object} e The event object, documented {@link
 *     https://developers.google.com/gmail/add-ons/concepts/actions#action_event_objects
 *     here}.
 * @return {CardService.ActionResponse} The action response to apply.
 */
function onChangeCat(e: any) {
  console.log(e);
  // Get the text that was shown in the current cat image. This was passed as a
  // parameter on the Action set for the button.
  const text = e.parameters.text;

  // The isHomepage parameter is passed as a string, so convert to a Boolean.
  const isHomepage = e.parameters.isHomepage === 'true';

  // Create a new card with the same text.
  const card = createCatCard(text, isHomepage);

  // Create an action response that instructs the add-on to replace
  // the current card with the new one.
  const navigation = CardService.newNavigation().updateCard(card);
  const actionResponse = CardService.newActionResponseBuilder().setNavigation(navigation);
  return actionResponse.build();
}

export const URLS = {
  rest: {
    users: {
      self: `/rest-api/users/me`
    },
    projects: {
      list: `/rest-api/projects`,
      get: (projectID: string) => {
        return {
          documents: `/rest-api/projects/${projectID}/documents`
        };
      }
    }
  },
  raw: (
    document: Pick<MCDocument, 'documentID'> & {
      major?: string;
      minor?: string;
    },
    theme: 'light' | 'dark'
  ) => {
    const base = `/raw/${document.documentID}?version=v${document.major ?? 0}.${
      document.minor ?? 1
    }&theme=${theme}&format=`;
    return {
      html: base + 'html',
      svg: base + 'svg',
      png: base + 'png'
    };
  },
  diagram: (d: Pick<MCDocument, 'projectID' | 'documentID' | 'major' | 'minor'>) => {
    const base = `/app/projects/${d.projectID}/diagrams/${d.documentID}/version/v${d.major}.${d.minor}`;
    return {
      self: base,
      edit: base + '/edit',
      view: base + '/view'
    } as const;
  },
  shortDiagram: (d: Pick<MCDocument, 'documentID'>) => {
    return `/app/diagrams/${d.documentID}`;
  }
} as const;

export interface MCUser {
  fullName: string;
  emailAddress: string;
}

export interface MCProject {
  id: string;
  title: string;
}

export interface MCDocument {
  documentID: string;
  projectID: string;
  major: string;
  minor: string;
  title: string;
  updatedAt: string;
}

export const CacheKeys = {
  projects: 'mc_projects',
  documents: (projectID: string) => `mc_documents_${projectID}`
} as const;

export const TimeInSeconds = {
  minute: 60,
  hour: 60 * 60,
  day: 60 * 60 * 24,
  minutes: (n: number) => n * TimeInSeconds.minute,
  hours: (n: number) => n * TimeInSeconds.hour,
  days: (n: number) => n * TimeInSeconds.day
} as const;
