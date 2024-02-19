import { RuntimeEnvironment } from '$lib/enums';
import { currentEnv } from '$lib/env';
import { writable } from 'svelte/store';
import { FeatureName, shouldUseFeature } from '../featureSet';

interface CookieBotConsent {
  necessary: boolean;
  preferences: boolean;
  marketing: boolean;
  statistics: boolean;
}

declare global {
  interface Window {
    Cookiebot?: {
      consent: CookieBotConsent;
    };
  }
}

export const analyticsEnabled = writable(
  shouldUseFeature(FeatureName.UserBehavior)
);

export const updateConsent = (consent?: CookieBotConsent) => {
  if (!consent) {
    return;
  }
  analyticsEnabled.set(consent.statistics && shouldUseFeature(FeatureName.UserBehavior));
};
