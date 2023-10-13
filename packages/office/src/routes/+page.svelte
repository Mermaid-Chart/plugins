<script lang="ts">
  import { onMount } from 'svelte';
  import { C } from '$lib/constants';
  import { OfficeManager } from '$lib/client/clientApi/officeManager';
  import { authStore } from '$lib/client/stores/auth';
  import DocumentCard from '$components/DocumentCard.svelte';
  import { documentStore } from '$lib/client/stores/documents';
  import { loading } from '$lib/client/stores/loading';
  import { showUserMessage } from '$lib/client/stores/messaging';
  import { MermaidChart, type MCProject, type MCDocument } from '$lib/mermaidChartApi';

  let selectedProject = 'personal';
  let authToken: string | undefined;
  let isOfficeInitialized = false;
  let officeManager: OfficeManager;
  let projects: MCProject[] = [];
  let projectIds: string[] = [];
  let isPowerpoint: boolean;

  const mermaidChartApi = new MermaidChart({
    clientID: C.ClientId,
    baseURL: C.MermaidChartBaseUrl,
    redirectURI: `${C.mcOfficeBaseUrl}/auth`
  });
  
  onMount(() => {
    const Office = window.Office;
    Office.onReady(async (info) => {
      isPowerpoint = info.host === Office.HostType.PowerPoint;
      isOfficeInitialized = true;
      officeManager = new OfficeManager(info.host, mermaidChartApi);

      authToken = await getAuthKey();
      
      if (authToken) {
        await loadProjects();
      }
    }).catch((error) => {
      showUserMessage('Office environment unable to start', 'error');
    });
  });

  const getAuthKey = async () => {
    let key;
    try {
      authToken = mermaidChartApi.getAccessToken();
      if (!authToken) {
        if (isOfficeInitialized && Office.context.roamingSettings) {
          authToken = Office.context.roamingSettings.get(C.TokenSettingName) as string;
        }
        if (!authToken) {
          authToken = authStore.accessKey();
        }
      }

      if (authToken) {
        await loadProjects();
      }
    } catch (error) {}

    return key;
  };

  const authenticate = () => {
    if (isOfficeInitialized) {
      Office.context.ui.displayDialogAsync(
        `${C.mcOfficeBaseUrl}/auth`,
        { height: 200, width: 200 },
        function (asyncResult) {
          const dialog = asyncResult.value;
          dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
            dialog.close();
            void processAuthMessage(arg);
          });
        }
      );
    }
  };

  const processAuthMessage = async (arg) => {
    const { status, result } = JSON.parse(arg.message);
    if (status && status == 'success') {
      authToken = result as string;
      mermaidChartApi.setAccessToken(authToken);

      if (isOfficeInitialized && Office.context.roamingSettings) {
        Office.context.roamingSettings.set(C.TokenSettingName, authToken);
      }
      authStore.update(authToken);

      await loadProjects();
    }
  };

  export async function syncDiagramsInDocument(): Promise<void> {
    await officeManager.syncDiagramsInDocument();
  }

  const loadProjects = async () => {
    projects = await mermaidChartApi.getProjects();
    projectIds = [];
    for(let project of projects) {
      projectIds.push(project.id);
    }
    await refreshDiagramList();
  };

  const refreshDiagramList = async () => {
    const documentList: MCDocument[] = [];
    documentStore.fetchDocuments([selectedProject], mermaidChartApi);
  };

  let innerWidth = 0;
  $: isMobile = innerWidth < 658;
  $: documentIds = $documentStore.documentIds;
</script>

<svelte:window bind:innerWidth />

<div class="flex flex-col items-center gap-6 p-4 w-full text-center">
  <div>
    <img src="/img/MermaidChart_Logo.png" alt="Mermaid Chart" class="w-60" />
  </div>

  <div class="flex w-full flex-col items-center ">
    {#if !authToken}
      <div class="w-full sm:w-1/3 pt-6">
        <div class="text-md">
          Create and edit diagrams in <a href="https://www.mermaidchart.com">Mermaid Chart</a> and easily
          sync them to your document with the Mermaid Chart Add-in for Microsoft.
        </div>
      </div>

      <div class="p-4">
        <button type="button" class="btn bg-[#FF3570] text-white" on:click={() => authenticate()}>
          Connect</button>
      </div>
      <div class="text-sm">
        Don't have an account? <a href="https://www.mermaidchart.com/app/sign-up">Sign up</a>
      </div>
    {:else}
      {#if !isPowerpoint}
        <div class="p-4">
          <button
            type="button"
            class="btn bg-[#FF3570] text-white tracking-wide"
            on:click={() => syncDiagramsInDocument()}>
            Sync diagrams</button>
        </div>
      {/if}
      <div class="px-4 py-6 sticky top-14 z-10 bg-neutral-50 w-screen shadow-sm">
        <div class="pb-2">Select project</div>
        <select
          id="projectSelectInput"
          class="select"
          bind:value={selectedProject}
          on:change={async () => refreshDiagramList()}
          placeholder="Select project">
          {#each projects as project}
            <option value={project.id}>{project.title}</option>
          {/each}
        </select>
      </div>

      {#if $loading.isBusyState}
        <div
          class="w-screen h-screen z-[1000] absolute left-0 top-0 bg-gray-600 opacity-50 flex
          items-center justify-center">
          <div class="text-indigo-100 text-4xl">
            <div class="loader mx-auto" />
            <div class="mt-4">{$loading.message}</div>
          </div>
        </div>
      {:else}
        <div class={isMobile ? 'flex flex-col w-screen px-5' : 'grid grid-cols-2 p-10 gap-3'}>
          {#if documentIds.length < 0}
            No diagrams found
          {:else}
            {#each documentIds as documentID}
              {#if $documentStore.documents[documentID].code !== null}
                <DocumentCard
                  {documentID}
                  {isOfficeInitialized}
                  {officeManager}
                  editUrl = {mermaidChartApi.getEditURL($documentStore.documents[documentID])} />
              {/if}
            {/each}
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>
