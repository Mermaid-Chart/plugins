export type MessageLevel = 'error' | 'info' | 'success' | 'warning';

import { toastStore } from '@skeletonlabs/skeleton';
import type { ToastSettings } from '@skeletonlabs/skeleton';

export const showUserMessage = (message: string, level: MessageLevel) => {
  let classes = '';
  switch (level) {
    case 'error': {
      classes = 'bg-gradient-to-tr from-rose-700 via-rose-600 to-rose-500';
      break;
    }
    case 'info': {
      classes = 'bg-gradient-to-tr from-sky-700 via-sky-600 to-sky-500';
      break;
    }
    case 'success': {
      classes = 'bg-gradient-to-tr from-emerald-700 via-emerald-600 to-emerald-500';
      break;
    }
    case 'warning': {
      classes = 'bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-500';
      break;
    }
  }
  const t: ToastSettings = {
    message,
    autohide: true,
    timeout: level === 'error' ? 50_000 : 5000,
    classes
  };
  toastStore.trigger(t);
};