/**
 * This is the main entry point for the add-on, which implicitly exports all the defined functions.
 * We should not use the `export` keyword in this file.
 * All functions that needs to be exported should be defined in this file.
 */
// import { onGmailCompose as _onGmailCompose } from './Gmail';
import { diagramLinkPreview as _diagramLinkPreview } from './Links';
import { authCallback as _authCallback, resetOAuth as _resetOAuth } from './Api';
import { createCard } from './Card';
import { injectImageIntoDocument as _injectImageIntoDocument } from './Docs';

// function onGmailCompose(e: any) {
//   return _onGmailCompose(e);
// }

function diagramLinkPreview(e: any) {
  return _diagramLinkPreview(e);
}

function authCallback(e: any) {
  return _authCallback(e);
}

function resetOAuth(e: any) {
  _resetOAuth();
  return onDocsHomepage(e);
}

function onDocsHomepage(e: any) {
  return createCard(e);
}

function onFileScopeGranted(e: any) {
  return createCard(e);
}

function onProjectSelect(e: { formInput: { project: string } }) {
  const selectedProject = e.formInput.project;
  return createCard(e, selectedProject);
}

function injectImageIntoDocument(e: any) {
  return _injectImageIntoDocument(e);
}

// TODO: Add a refresh all images button, which will scan all images in the document with our URL and refresh them
