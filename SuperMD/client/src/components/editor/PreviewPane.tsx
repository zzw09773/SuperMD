import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MermaidRenderer from './MermaidRenderer';

interface PreviewPaneProps {
  content: string;
}

const PreviewPane = ({ content }: PreviewPaneProps) => {
  return (
    <div className="p-6 prose prose-slate max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            if (!inline && language === 'mermaid') {
              return <MermaidRenderer chart={String(children)} />;
            }

            return !inline ? (
              <pre className={className}>
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          img({ node, src, alt, ...props }) {
            // Convert local paths to full URLs
            const imageSrc = src?.startsWith('/uploads')
              ? `http://localhost:3000${src}`
              : src;
            return <img src={imageSrc} alt={alt} {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default PreviewPane;
