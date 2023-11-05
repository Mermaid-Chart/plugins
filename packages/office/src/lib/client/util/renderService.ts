import { render as renderDiagram } from '$lib/client/util/mermaid';
import { mermaidTheme } from '$lib/client/util/mermaidTheme';

export async function populateSvgCode(code: string, viewId: string): Promise<{ svgCode: string }> {
  const config = {theme: 'base', themeVariables: mermaidTheme};
  let svgCode = '';
  if (code) {
    try {
      const diagram = await renderDiagram(config, code, viewId);
      svgCode = diagram.svg || '';
    } catch (error) {
      console.log(error);
      return { svgCode: ''};
    }
  }

  return { svgCode };
}