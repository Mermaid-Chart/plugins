<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  import '../theme.postcss';
  import '../app.postcss';
  import { navigating } from '$app/stores';
  import { AppBar, popup, storePopup, Toast } from '@skeletonlabs/skeleton';

  let syncDiagramsInDocument: () => Promise<void>;
</script>

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
      <slot {syncDiagramsInDocument}/>
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
