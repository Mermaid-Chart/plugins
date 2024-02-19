<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  import { env as publicEnv } from '$env/dynamic/public';
  import { initializeMixPanel } from '$lib/client/util/sendEvents';
  import '../theme.postcss';
  import '../app.postcss';
  import { navigating } from '$app/stores';
  import { onMount } from 'svelte';
  import { sessionStore } from '$lib/client/stores/session';
  import { Toast } from '@skeletonlabs/skeleton';
  import { updateConsent } from '$lib/client/stores/analytics';
  import { FeatureName, shouldUseFeature } from '$lib/client/featureSet';

  let syncDiagramsInDocument: () => Promise<void>;

  onMount(() => {
    initializeMixPanel(
      publicEnv.PUBLIC_MIXPANEL_TOKEN, 
      $sessionStore.id, 
      $sessionStore);

    window.addEventListener(
      'CookiebotOnConsentReady',
      () => {
        updateConsent(window.Cookiebot?.consent);
      },
      false
    );
  });
</script>

<svelte:head>
  {#if shouldUseFeature(FeatureName.CookieBot)}
    <script
      id="Cookiebot"
      src="https://consent.cookiebot.com/uc.js"
      data-cbid="0ef251a9-4ed6-4465-895b-5fb661fb0601"
      data-blockingmode="auto"
      type="text/javascript"></script>
  {/if}
</svelte:head>


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
