<script lang="ts">
  import { onMount } from 'svelte';
  import { populateSvgCode } from '$lib/client/util/renderService';

  export let viewId = '';
  export let code = '';
  export let insertHandler = () => {};

  let container: HTMLDivElement;
  let hide = false;

  async function handleDiagramRendering() {
    try {
      if (container && code) {
        const { svgCode } = await populateSvgCode(code, viewId);
        container.innerHTML = svgCode;
      } 
    } catch (error) {
      console.log(error);
    }
  };

  onMount(async function() {
    await handleDiagramRendering();
  });
</script>

<div>
  <button on:click={insertHandler}>
    <div
      id="container"
      bind:this={container}
      class="flex justify-center w-full overflow-hidden h-full"
      class:hide />
    </button>
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
</style>
