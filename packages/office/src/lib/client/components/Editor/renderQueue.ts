let renderPromise: Promise<void> | undefined;
let resolver: (() => void) | undefined;

/**
 * Asynchronously waits for the next render to finish.
 * This is useful when we need to wait for rendering after we make a state change.
 * @example
 * ```ts
 * state.panZoom = false;
 * await waitForRender();
 * download();
 * ```
 * @returns A promise that resolves when the next render is finished.
 */
export const waitForRender = () => {
  if (!renderPromise) {
    renderPromise = new Promise((resolve) => {
      resolver = () => {
        renderPromise = undefined;
        // Wait for the next tick to resolve the promise.
        void Promise.resolve().then(resolve);
      };
    });
  }
  return renderPromise;
};

export const renderFinished = () => {
  resolver?.();
};
