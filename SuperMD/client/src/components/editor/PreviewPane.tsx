import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkFootnotes from 'remark-footnotes';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import MermaidRenderer from './MermaidRenderer';

interface PreviewPaneProps {
  content: string;
}

const PreviewPane = ({ content }: PreviewPaneProps) => {
  // Helper function to generate heading IDs
  const generateHeadingId = (text: string, index: number) => {
    const cleanText = String(text).toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
    return `heading-${index}-${cleanText}`;
  };

  let headingIndex = 0;

  return (
    <div className="p-6 prose prose-lg prose-slate max-w-none dark:prose-invert prose-headings:font-bold prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-h4:text-xl prose-h5:text-lg prose-h6:text-base prose-h1:border-b prose-h1:pb-2 prose-h2:border-b prose-h2:pb-1 prose-h1:mt-6 prose-h2:mt-5 prose-h3:mt-4 prose-p:my-3 prose-ul:my-3 prose-ol:my-3 prose-li:my-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, [remarkFootnotes, { inlineNotes: true }]]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1({ node, children, ...props }) {
            const id = generateHeadingId(children, headingIndex++);
            return (
              <h1 id={id} className="text-4xl font-bold mt-6 mb-4 pb-2 border-b border-gray-300 dark:border-gray-700" {...props}>
                {children}
              </h1>
            );
          },
          h2({ node, children, ...props }) {
            const id = generateHeadingId(children, headingIndex++);
            return (
              <h2 id={id} className="text-3xl font-bold mt-5 mb-3 pb-1 border-b border-gray-200 dark:border-gray-700" {...props}>
                {children}
              </h2>
            );
          },
          h3({ node, children, ...props }) {
            const id = generateHeadingId(children, headingIndex++);
            return (
              <h3 id={id} className="text-2xl font-bold mt-4 mb-2" {...props}>
                {children}
              </h3>
            );
          },
          h4({ node, children, ...props }) {
            const id = generateHeadingId(children, headingIndex++);
            return (
              <h4 id={id} className="text-xl font-bold mt-3 mb-2" {...props}>
                {children}
              </h4>
            );
          },
          h5({ node, children, ...props }) {
            const id = generateHeadingId(children, headingIndex++);
            return (
              <h5 id={id} className="text-lg font-bold mt-2 mb-1" {...props}>
                {children}
              </h5>
            );
          },
          h6({ node, children, ...props }) {
            const id = generateHeadingId(children, headingIndex++);
            return (
              <h6 id={id} className="text-base font-bold mt-2 mb-1" {...props}>
                {children}
              </h6>
            );
          },
          p({ node, children, ...props }) {
            return (
              <p className="my-3 leading-7" {...props}>
                {children}
              </p>
            );
          },
          ul({ node, children, ...props }) {
            return (
              <ul className="my-3 ml-6 list-disc space-y-1" {...props}>
                {children}
              </ul>
            );
          },
          ol({ node, children, ...props }) {
            return (
              <ol className="my-3 ml-6 list-decimal space-y-1" {...props}>
                {children}
              </ol>
            );
          },
          li({ node, children, ...props }) {
            return (
              <li className="my-1 leading-7" {...props}>
                {children}
              </li>
            );
          },
          blockquote({ node, children, ...props }) {
            return (
              <blockquote className="my-4 pl-4 border-l-4 border-gray-300 dark:border-gray-600 italic text-gray-700 dark:text-gray-300" {...props}>
                {children}
              </blockquote>
            );
          },
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            if (!inline && language === 'mermaid') {
              return <MermaidRenderer chart={String(children)} />;
            }

            return !inline ? (
              <pre className="my-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto">
                <code className={`${className} text-sm`} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          img({ node, src, alt, ...props }) {
            // Convert local paths to full URLs
            const imageSrc = src?.startsWith('/uploads')
              ? `http://localhost:3000${src}`
              : src;
            return (
              <img
                src={imageSrc}
                alt={alt}
                className="my-4 max-w-full h-auto rounded-lg shadow-md"
                {...props}
              />
            );
          },
          a({ node, children, href, ...props }) {
            return (
              <a
                href={href}
                className="text-blue-600 dark:text-blue-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
          table({ node, children, ...props }) {
            return (
              <div className="my-4 overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          thead({ node, children, ...props }) {
            return (
              <thead className="bg-gray-100 dark:bg-gray-800" {...props}>
                {children}
              </thead>
            );
          },
          th({ node, children, ...props }) {
            return (
              <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-bold" {...props}>
                {children}
              </th>
            );
          },
          td({ node, children, ...props }) {
            return (
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2" {...props}>
                {children}
              </td>
            );
          },
          hr({ node, ...props }) {
            return (
              <hr className="my-6 border-t-2 border-gray-300 dark:border-gray-700" {...props} />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default PreviewPane;
