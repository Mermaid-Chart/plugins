import { writable } from 'svelte/store';

interface LoadingState {
  isBusyState: boolean;
  message: string;
}

const currentLoadingState : LoadingState = {
  isBusyState: false,
  message: ''
}

function createStore() {
  const { subscribe, set, update } = writable(currentLoadingState);
  return {
    subscribe,
    setState: (newState: boolean, message: string) => {
      const res = update((state) => {
        state.isBusyState = newState;
        state.message = message;
        
        return { ...state };
      });
      return res;
    },
    reset: () => set(currentLoadingState)
  };
}

export const loading = createStore();

