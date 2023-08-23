<script lang="ts">
  import type { OfficeManager } from '$lib/client/clientApi/officeManager';
  import { URLS } from '$lib/urls';
  import { createEventDispatcher } from 'svelte';
  import { documentStore } from '../stores/documents';

  export let documentID: string;
  export let isOfficeInitialized = false;

  const dispatch = createEventDispatcher();
  const diagram = $documentStore.documents[documentID];

  export let officeManager: OfficeManager;

  const editUrl = URLS.app.diagrams.pick(diagram).edit;

  const editDiagram = (url: string) => {
    if (isOfficeInitialized) {
      Office.context.ui.displayDialogAsync(
        url,
        { height: 300, width: 600 },
        function (asyncResult) {
          const dialog = asyncResult.value;
          dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
            dialog.close();
            editFinished();
          });
        }
      );
    }
  };

  const editFinished = () => {
    dispatch('editFinished');
  };

  const doInsert = async () => {
    await officeManager.insertDiagram(diagram);
  };
</script>

<button on:click={() => doInsert()} class="card hover:shadow-lg p-3 cursor-pointer">
  <div data-testid="diagram-title" class="mb-4 grid gap-2 text-center">
    {diagram.title || 'Untitled Diagram'}
  </div>
  <div class="text-xs text-gray-500 dark:text-gray-400 my-2 text-center flex flex-col gap-1">
    <div>Last updated:</div>
    <div>{diagram?.updatedAt ? new Date(diagram?.updatedAt).toLocaleString() : 'na'}</div>
  </div>
  <div class="text-xs text-gray-500 dark:text-gray-400 p-2 text-center flex flex-col gap-1">
    <div>
      <a on:click|stopPropagation class="ms-link" href={editUrl}>Open in Mermaid Chart</a>
    </div>
  </div>
</button>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css"
    integrity="sha512-xh6O/CkQoPOWDdYTDqeRdPCVd1SpvCA9XXcUnZS2FmJNp1coAFzvtCN9BmamE+4aHK8yyUHUSCcJHgXloTyT2A=="
    crossorigin="anonymous"
    referrerpolicy="no-referrer" />
</svelte:head>

<style>
  :global(svg) {
    font-family: 'Arial' !important;
  }

  #container {
    transition: visibility 0.3s;
  }

  .hide {
    visibility: hidden;
  }

  .card :global(svg) {
    width: 100%;
    aspect-ratio: 1/1;
  }

  .icon-document-card :global(svg) {
    width: 16px !important;
    height: 16px !important;
    /* @apply text-white; */
  }

  @media only screen and (max-width: 600px) {
    .icon-document-card :global(svg) {
      width: 24px !important;
      height: 24px !important;
      /* @apply text-white; */
    }
  }
  .diagram-thumbnail {
    width: 100%;
    aspect-ratio: 1/1;
  }

  .thumbnail {
    border-radius: 5px;
    padding: 4px;
  }
</style>
