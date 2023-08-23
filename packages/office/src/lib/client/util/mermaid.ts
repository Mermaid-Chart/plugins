import { renderFinished } from '$components/Editor/renderQueue';
import mermaid from 'mermaid';
import type { MermaidConfig, RenderResult } from 'mermaid';

export const render = async (
  config: MermaidConfig,
  code: string,
  id: string
): Promise<RenderResult> => {
  // Should be able to call this multiple times without any issues.
  mermaid.initialize(config);
  try {
    const result = await mermaid.render(id, code);
    return result;
  } catch {
    const errorDiv = document.querySelector(`#d${id}`);
    const svg = errorDiv?.innerHTML ?? '';
    errorDiv?.remove();
    return {
      svg,
      bindFunctions: undefined
    };
  } finally {
    renderFinished();
  }
};

export const parse = async (code: string): Promise<boolean> => {
  const res = await mermaid.parse(code, { suppressErrors: true });
  return res || false;
};
