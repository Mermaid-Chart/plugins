import { C } from '$lib/constants';
import { persisted } from 'svelte-local-storage-store'
import { get } from 'svelte/store'

const auth = persisted(C.TokenSettingName, '');

function createAuthStore() {
  const { subscribe, set } = auth;
  return {
    subscribe,
    update: (newKey: string) => {
      auth.set(newKey);
      },
    accessKey: () => {
      const key = get(authStore);
      return key;
    },
    reset: () => set('')
  };
}

export const authStore = createAuthStore();

interface StateStore {
  state: string;
  verifier: string;
}

const pendingState: StateStore =  {
  state: '',
  verifier: ''
}

const state = persisted('AuthState', pendingState);

function createStateStore() {
  const { subscribe, set, update } = state;
  return {
    subscribe,
    update: (state: string, verifier: string) => {
      const res = update((stateStore) => {
        stateStore.state = state;
        stateStore.verifier = verifier;
        return stateStore;
      });
      return res;
    },
    state: () => {
      return get(state);
    },
    reset: () => set(pendingState)
  };
}

export const authStateStore = createStateStore();
