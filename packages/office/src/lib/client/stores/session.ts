import { Tier } from '$lib/enums';
import type { MCUser } from '$lib/mermaidChartApi';
import { derived, writable } from 'svelte/store';

const defaultSession: MCUser = {
  emailAddress: '',
  id: '',
  authID: '',
  analyticsID: '',
  subscriptionTier: Tier.Free,
  fullName: '',
  allowMarketingEmail: false,
  allowProductEmail: true
};

function createSession() {
  const { subscribe, set, update } = writable(defaultSession);

  return {
    subscribe,
    update: (user: MCUser) => {
      const res = update((session) => {
        return { ...session, ...user };
      });
      return res;
    },
    set,
    reset: () => set(defaultSession)
  };
}

export const sessionStore = createSession();

export const isFreeUser = derived(sessionStore, ({ subscriptionTier }) => {
  return subscriptionTier === Tier.Free;
});
