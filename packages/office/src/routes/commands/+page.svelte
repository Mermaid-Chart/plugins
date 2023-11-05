<script lang="ts">
  import { onMount } from 'svelte';

  onMount(() => {
    //const Office = window.Office;
    Office.onReady(() => {
      console.log('Office Ready!');
    });
  });

    function getGlobal() {
    return typeof self !== 'undefined'
      ? self
      : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
      ? global
      : undefined;
  }

  const g = getGlobal() as any;

  // The add-in command functions need to be available in global scope
  g.action = action;
</script>
