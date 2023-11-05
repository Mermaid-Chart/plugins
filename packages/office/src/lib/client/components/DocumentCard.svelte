<script lang="ts">
  import type { OfficeManager } from '$lib/client/clientApi/officeManager';
  import { createEventDispatcher } from 'svelte';
  import { documentStore } from '../stores/documents';
  import { storePopup } from '@skeletonlabs/skeleton';
  import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
  import { C } from '$lib/constants';
  import { loading } from '../stores/loading';
    import RawView from './Editor/RawView.svelte';

  storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });

  export let documentID: string;
  export let isOfficeInitialized: boolean;
  export let officeManager: OfficeManager;
  export let editUrl: string;
  
  const diagram = $documentStore.documents[documentID];
  let code = diagram.code;

  const editDiagram = () => {
    if (isOfficeInitialized) {
      if (Office.context.requirements.isSetSupported('Office.Extensibility.HostName')) {
        window.open(editUrl, '_blank');
      }
      Office.context.ui.openBrowserWindow(editUrl);
    }
  };

  const insertDiagram = async () => {
    await officeManager.insertDiagram(diagram);
  };
</script>

<div class="space-y-4">
  <div class="flex flex-col space-y-2 pt-4">
    <div class="text-left">
      {diagram.title || 'Untitled Diagram'}
    </div>
  </div>
  <div class="diagram-thumbnail flex justify-center w-full items-center">
    {#key code}
      <RawView bind:code viewId={`diagram-${diagram.documentID}`} insertHandler={insertDiagram} />
    {/key}
  </div>

  <div class="flex text-xs text-gray-500 dark:text-gray-400 gap-2 pb-2">
    <div>Last updated:</div>
    <div>{diagram?.updatedAt ? new Date(diagram?.updatedAt).toLocaleString() : 'na'}</div>
  </div>
</div>

<div class="flex gap-4 items-center pb-4">
  <button
        class="btn border border-slate-300 text-primary-500 gap-1 hover:bg-primary-300 mr-3"
        on:click={() => insertDiagram()}>
        Insert
      </button>

  <span class="divider-vertical h-4" />
  <button class="btn border border-slate-300 text-primary-500 gap-1 hover:bg-primary-300 mr-3"
  on:click={() => editDiagram()}>Edit</button>
</div>

<hr class="p-4"/>

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
  }

  .thumbnail {
    border-radius: 5px;
    padding: 4px;
  }
</style>
