<script lang="ts">
    import { C } from "$lib/constants";
    import { MermaidChart, type MCDocument } from "$lib/mermaidChartApi";
    import { authStore } from '$lib/client/stores/auth';
    import { showUserMessage } from "$lib/client/stores/messaging";
    import { onMount } from "svelte";
    import { page } from "$app/stores";

    let authToken: string | undefined;
    const mermaidChartApi = new MermaidChart({
      clientID: C.ClientId,
      baseURL: C.MermaidChartBaseUrl,
      redirectURI: `${C.mcOfficeBaseUrl}/auth`
    });

  let container: HTMLDivElement;
  let document: MCDocument;
 
  onMount(() => {
    const Office = window.Office;
    Office.onReady(async (info) => {
      const params = $page.url.searchParams;
      const documentId = params.get('id')

      authToken = authStore.accessKey();
      mermaidChartApi.setAccessToken(authToken);
      if(documentId) {
        document = await mermaidChartApi.getDocument(documentId);
        await handleDiagramRendering();
      } else {
        showUserMessage('Unable to load diagram preview', 'error');
      }
      
    }).catch((error) => {
      showUserMessage('Office environment unable to start', 'error');
    });
  });

  const handleButtonClick = (shouldInsert: boolean) => {
    Office.context.ui.messageParent(JSON.stringify({ status: 'success', result: shouldInsert }));
  };

  const handleDiagramRendering = async() => {
    try {
      if (container) {
        
        const svgCode  = await mermaidChartApi.getRawDocument(document, 'light')
        container.innerHTML = svgCode;
      } 
    } catch (error) {
      console.log(error);
    }
  };
</script>

<div
  id="container"
  bind:this={container}
  class="flex justify-center w-full overflow-hidden h-full" />

  <footer class="modal-footer flex justify-end pt-6">
    <button
      class="btn outline outline-gray-300 hover:outline-primary-500 dark:"
      on:click={() => handleButtonClick(false)}>Cancel</button>

    <button class="ml-4 btn primary" on:click={() => handleButtonClick(true)}>
      Insert</button>
  </footer>

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
</style>