import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  chart: string;
}

const MermaidRenderer = ({ chart }: MermaidRendererProps) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
    
    const renderChart = async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(`mermaid-${Date.now()}`, chart);
        setSvg(renderedSvg);
        setError('');
      } catch (err) {
        setError('Failed to render diagram');
        console.error('Mermaid error:', err);
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return <div className="text-red-500 p-4 border border-red-300 rounded">{error}</div>;
  }

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: svg }} />;
};

export default MermaidRenderer;
