/**
 * This is the main entry point for the add-on, which implicitly exports all the defined functions.
 * We should not use the `export` keyword in this file.
 * All functions that needs to be exported should be defined in this file.
 */
import { diagramLinkPreview as _diagramLinkPreview } from './Links';
import { authCallback as _authCallback, resetOAuth as _resetOAuth } from './Api';
import { createCard } from './Card';
import {
  injectImageIntoDocument as _injectImageIntoDocument,
  refreshAllImagesInDocument as _refreshAllImagesInDocument,
} from './Docs';

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

function refreshAllImagesInDocument(e: any) {
  return _refreshAllImagesInDocument();
}
