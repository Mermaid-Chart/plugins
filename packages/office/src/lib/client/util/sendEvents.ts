import { browser } from '$app/environment';
import type { BehaviorEvent } from '$lib/types';
import mixpanel from 'mixpanel-browser';
import { analyticsEnabled } from '../stores/analytics';
import { minutesToMilliSeconds } from '$lib/utils';
import type { MCUser } from '$lib/mermaidChartApi';
import log from '$lib/log';
import { FeatureName, shouldUseFeature } from '../featureSet';

let initialized = false;

interface QueueItem {
  description: string;
  event: BehaviorEvent;
}

const MAX_QUEUE_SIZE = 100;
const queue: QueueItem[] = [];

function sendQueue() {
  if (queue.length === 0 || !initialized) {
    return;
  }
  log.info('Sending mixpanel events');
  for (const { description, event } of queue) {
    try {
      mixpanel.track(description, event);
    } catch (error) {
      log.error(error);
    }
  }
  queue.length = 0;
}

function init(mixPanelProject: string, sessionID: string, session: MCUser) {
  if (initialized) {
    return;
  }
  // Execute code that sets marketing cookies
  mixpanel.init(mixPanelProject, { debug: true, ignore_dnt: true });

  mixpanel.identify(session?.analyticsID || sessionID);
  mixpanel.people.set({
    $email: session.emailAddress,
    $name: session.fullName,
    tier: session.subscriptionTier,
    AllowProductEmail: session.allowProductEmail
  });
  initialized = true;
  sendQueue();
}

export function initializeMixPanel(mixPanelProject: string, sessionID: string, session: MCUser) {
  if (!browser || !mixPanelProject) {
    return;
  }
  analyticsEnabled.subscribe((enabled) => {
    // This will initialize MixPanel only after the user has accepted analytics cookies
    if (enabled) {
      init(mixPanelProject, sessionID, session);
    }
  });
}

function sendEvent(description: string, event: BehaviorEvent) {
  // Avoid queueing too many events
  if (queue.length < MAX_QUEUE_SIZE) {
    queue.push({ description, event });
  }
  sendQueue();
}

const delaysPerEvent: Record<string, number> = {
  DIAGRAM_TYPE: minutesToMilliSeconds(1)
};
const timeouts: Record<string, number> = {};

export function sendBehaviorEvent(description: string, event: BehaviorEvent) {
  if(shouldUseFeature(FeatureName.UserBehavior)) {
    if (timeouts[event.eventID]) {
      clearTimeout(timeouts[event.eventID]);
    }
    if (delaysPerEvent[event.eventID] === undefined) {
      sendEvent(description, event);
    } else {
      timeouts[event.eventID] = window.setTimeout(() => {
        sendEvent(description, event);
        delete timeouts[event.eventID];
      }, delaysPerEvent[event.eventID]);
    }
  }
}

export function clear() {
  if (browser && initialized) {
    mixpanel.reset();
  }
}
