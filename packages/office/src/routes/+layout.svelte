<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  import '../theme.postcss';
  import '../app.postcss';
  import { navigating } from '$app/stores';
  import { AppBar, popup, storePopup, Toast } from '@skeletonlabs/skeleton';
  import EllipsisIcon from 'svelte-icons/fa/FaEllipsisV.svelte';
  import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';

  storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });

  let syncDiagramsInDocument: () => Promise<void>;
</script>

<AppBar
  gridColumns="grid-cols-3"
  class="shadow shadow-slate-500/10 w-screen sticky top-0 z-20"
  slotDefault="place-self-center"
  slotTrail="place-content-end">
  <svelte:fragment slot="lead">
    <a href="/" class="whitespace-nowrap no-underline"> Mermaid Chart </a>
  </svelte:fragment>
  <svelte:fragment slot="trail">
    <button
      use:popup={{ event: 'click', target: 'header-menu' }}
      class="p-2 rounded-full hover:bg-neutral-200">
      <div class="w-4 h-4"><EllipsisIcon /></div>
    </button>
  </svelte:fragment>
</AppBar>

<div data-popup="header-menu" class="z-20">
  <div class="flex flex-col gap-4 bg-neutral-100 rounded p-8">
    <a href="/diagrams">Diagrams</a>
    <hr />
    <button on:click={() => syncDiagramsInDocument()} class="text-left">Sync</button>
    <hr />
    <a href="/settings" class="no-underline">Settings</a>
  </div>
</div>

<Toast position="t" />

<div>
  {#if $navigating}
    <div
      class="w-screen h-screen z-[1000] absolute left-0 top-0 bg-gray-600 opacity-50 flex
      align-middle justify-center">
      <div class="text-indigo-100 text-4xl font-bold my-auto">
        <div class="loader mx-auto" />
        <div class="mt-4">Loading page...</div>
      </div>
    </div>
  {:else}
    <div class="pb-12">
      <slot />
    </div>
  {/if}
</div>

<style>
  .loader {
    border: 0.35em solid #f3f3f3;
    border-radius: 50%;
    border-top: 0.35em solid #6365f1;
    width: 2em;
    height: 2em;
    -webkit-animation: spin 2s linear infinite; /* Safari */
    animation: spin 2s linear infinite;
  }

  /* Safari */
  @-webkit-keyframes spin {
    0% {
      -webkit-transform: rotate(0deg);
    }
    100% {
      -webkit-transform: rotate(360deg);
    }
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
