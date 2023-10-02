<script lang="ts">
  import type { OfficeManager } from '$lib/client/clientApi/officeManager';
  import { createEventDispatcher } from 'svelte';
  import { documentStore } from '../stores/documents';
  import EllipsisIcon from 'svelte-icons/fa/FaEllipsisV.svelte';
  import { popup, storePopup } from '@skeletonlabs/skeleton';
  import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
    import { C } from '$lib/constants';

  storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });

  export let documentID: string;
  export let isOfficeInitialized = false;
  export let officeManager: OfficeManager;
  export let editUrl: string;
  
  const dispatch = createEventDispatcher();
  const diagram = $documentStore.documents[documentID];

  const editDiagram = () => {
    if (isOfficeInitialized) {
      Office.context.ui.displayDialogAsync(
        editUrl,
        { height: 300, width: 600 },
        function (asyncResult) {
          const dialog = asyncResult.value;
          dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
            dialog.close();
            void editFinished();
          });
        }
      );
    }
  };

  const previewDiagram = () => {
    if (isOfficeInitialized) {
      Office.context.ui.displayDialogAsync(
        `${C.mcOfficeBaseUrl}/preview?id=${documentID}`,
        { height: 300, width: 600 },
        function (asyncResult) {
          const dialog = asyncResult.value;
          dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
            dialog.close();
            void processPreviewResponse(arg);
          });
        }
      );
    }
  };

  const processPreviewResponse = async (arg) => {
    const response = JSON.parse(arg.message);
    if(response) {
      await officeManager.insertDiagram(diagram);
    }
  };

  const editFinished = () => {
    dispatch('editFinished');
  };

  const insertDiagram = async () => {
    await officeManager.insertDiagram(diagram);
  };
</script>

<div class="flex flex-nowrap gap-2">
  <div data-testid="diagram-title" class="mb-4 grid gap-2 text-center">
    {diagram.title || 'Untitled Diagram'}
  </div>
  <button
      use:popup={{ event: 'click', target: 'header-menu' }}
      class="p-2 rounded-full hover:bg-neutral-200">
      <div class="w-4 h-4"><EllipsisIcon /></div>
    </button>
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

<hr class="my-4" />
<div data-popup="header-menu" class="z-20">
  <div class="flex flex-col gap-4 bg-neutral-100 rounded p-8">
    <button on:click={() => insertDiagram()} class="text-left">Insert</button>
    <hr />
    <button on:click={() => previewDiagram()} class="text-left">Preview</button>
    <hr />
    <button on:click={() => editDiagram()} class="text-left">Edit</button>
  </div>
</div>

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
