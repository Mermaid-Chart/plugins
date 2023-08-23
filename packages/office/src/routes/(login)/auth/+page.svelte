<script lang="ts">
  import { page } from '$app/stores';
  import { MermaidChart } from '$lib/mermaidChartApi';
  import { C } from '$lib/constants';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { authStateStore } from '$lib/client/stores/auth';

  const mermaidChartApi = new MermaidChart({
    clientID: C.ClientId,
    baseURL: C.MermaidChartBaseUrl,
    redirectURI: C.oauthRedirect
  });

  let userMessage = '';

  onMount(() => {
    const Office = window.Office;
    Office.onReady(async (info) => {
      const params = $page.url.searchParams;
      if (params.get('state')) {
        // if the state param is in url, this should be an auth response
        try {
          const state = authStateStore.state();
          mermaidChartApi.setPendingState(state.state, state.verifier);

          await mermaidChartApi.handleAuthorizationResponse(params);
          const authToken = mermaidChartApi.getAccessToken();
          authStateStore.reset();
          Office.context.ui.messageParent(JSON.stringify({ status: 'success', result: authToken }));

          userMessage = 'Authentication successful. You can now close this window';
        } catch (error) {
          userMessage = 'Authentication failed, please contact support';
          console.error(error);
        }
      } else {
        authStateStore.reset();
        userMessage = 'Redirecting to Mermaid Chart for authentication';
        const authData = await mermaidChartApi.getAuthorizationData();
        const verifier = mermaidChartApi.getCodeVerifier(authData.state);
        authStateStore.update(authData.state, verifier);
        void goto(authData.url);
      }
    }).catch(() => {
      //failed to load
    });
  });
</script>

<div class="flex flex-col items-center gap-6 p-16 w-full text-center">
  <div>
    <img src="/img/MermaidChart_Logo.png" alt="Mermaid Chart" class="w-60" />
  </div>

  <div class="flex w-full flex-col items-center ">
    <div class="w-full sm:w-1/3 pt-6">
      <div class="text-md">
        {userMessage}
      </div>
    </div>
  </div>
</div>
