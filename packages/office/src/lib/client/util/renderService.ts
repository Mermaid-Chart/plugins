import { render as renderDiagram } from '$lib/client/util/mermaid';
import { mermaidTheme } from '$lib/client/util/mermaidTheme';
import html2canvas from 'html2canvas';

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

export const svgToPng = async(svgCode: string) => {
  const svgContainer = document.createElement('div');
  svgContainer.innerHTML = svgCode;

  try {
    const canvas = await html2canvas(svgContainer);
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
  }

  return '';
};