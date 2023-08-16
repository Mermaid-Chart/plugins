import { baseURL, getDocuments, getProjects } from './Api';
import { MCProject, URLS } from './Common';

export function createCard(e: any, selectedProject?: string) {
  const builder = CardService.newCardBuilder();
  const projects: MCProject[] = getProjects().sort((a, b) => a.title.localeCompare(b.title));
  const projectSelectionSection = CardService.newCardSection();
  const radioGroup = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setTitle('Select Project')
    .setFieldName('project')
    .setOnChangeAction(CardService.newAction().setFunctionName('onProjectSelect'));
  const personalProject = projects.find((p) => p.title.toLowerCase().trim() === 'personal');
  const idToSelect = selectedProject ?? personalProject?.id;
  for (const { title, id } of projects) {
    radioGroup.addItem(title, id, id === idToSelect);
  }
  projectSelectionSection.addWidget(radioGroup);
  builder.addSection(projectSelectionSection);

  if (!idToSelect) {
    const text =
      projects.length > 0
        ? 'Select a project to continue.'
        : 'No projects found. Create a project in Mermaid Chart to continue.';
    builder.addSection(
      CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(text))
    );
    return builder.build();
  }

  const documents = getDocuments(idToSelect);
  const documentSection = CardService.newCardSection().setHeader('Diagrams');
  documentSection.addWidget(
    CardService.newTextParagraph().setText('Click on a diagram to insert it into your document.')
  );
  for (const document of documents) {
    const { title, documentID, updatedAt } = document;
    documentSection.addWidget(
      CardService.newDecoratedText()
        .setText(title ?? 'Untitled Diagram')
        .setBottomLabel('Last Updated: ' + updatedAt)
        .setOnClickAction(
          CardService.newAction().setFunctionName('injectImageIntoDocument').setParameters({
            documentID
          })
        )
        .setButton(
          CardService.newImageButton()
            // TODO: Fix URL
            .setIconUrl('https://www.mermaidchart.com/img/mermaid-chart-48.png')
            .setOpenLink(CardService.newOpenLink().setUrl(baseURL + URLS.diagram(document).edit))
            .setAltText('Open in Mermaid Chart')
        )
    );
  }
  builder.addSection(documentSection);
  builder.setFixedFooter(
    CardService.newFixedFooter()
      .setPrimaryButton(
        CardService.newTextButton()
          .setText('Logout')
          .setOnClickAction(CardService.newAction().setFunctionName('resetOAuth'))
      )
      .setSecondaryButton(
        CardService.newTextButton()
          .setText('Sync Diagrams')
          .setOnClickAction(CardService.newAction().setFunctionName('refreshAllImagesInDocument'))
      )
  );
  return builder.build();
}
