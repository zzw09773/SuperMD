import { Children, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import MermaidRenderer from './MermaidRenderer';

interface PreviewPaneProps {
  content: string;
}

const PreviewPane = ({ content }: PreviewPaneProps) => {
  const extractText = (node: ReactNode): string => {
    return Children.toArray(node)
      .map((child) => {
        if (typeof child === 'string') return child;
        if (typeof child === 'number') return String(child);
        return '';
      })
      .join(' ');
  };

  const generateHeadingId = (node: ReactNode, index: number) => {
    const cleanText = extractText(node)
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-');
    return `heading-${index}-${cleanText}`;
  };

  let headingIndex = 0;

  return (
    <div className="p-6 prose prose-lg prose-slate max-w-none dark:prose-invert prose-headings:font-bold prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-h4:text-xl prose-h5:text-lg prose-h6:text-base prose-h1:border-b prose-h1:pb-2 prose-h2:border-b prose-h2:pb-1 prose-h1:mt-6 prose-h2:mt-5 prose-h3:mt-4 prose-p:my-3 prose-ul:my-3 prose-ol:my-3 prose-li:my-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1({ children, ...props }: any) {
            const id = generateHeadingId(children, headingIndex++);
            return (
              <h1 id={id} className="text-4xl font-bold mt-6 mb-4 pb-2 border-b border-gray-300 dark:border-gray-700" {...props}>
                {children}
              </h1>
            );
          },
          h2({ children, ...props }: any) {
            const id = generateHeadingId(children, headingIndex++);
            return (
              <h2 id={id} className="text-3xl font-bold mt-5 mb-3 pb-1 border-b border-gray-200 dark:border-gray-700" {...props}>
                {children}
              </h2>
            );
          },
          h3({ children, ...props }: any) {
            const id = generateHeadingId(children, headingIndex++);
            return (
              <h3 id={id} className="text-2xl font-bold mt-4 mb-2" {...props}>
                {children}
              </h3>
            );
          },
          h4({ children, ...props }: any) {
            const id = generateHeadingId(children, headingIndex++);
            return (
              <h4 id={id} className="text-xl font-bold mt-3 mb-2" {...props}>
                {children}
              </h4>
            );
          },
          h5({ children, ...props }: any) {
            const id = generateHeadingId(children, headingIndex++);
            return (
              <h5 id={id} className="text-lg font-bold mt-2 mb-1" {...props}>
                {children}
              </h5>
            );
          },
          h6({ children, ...props }: any) {
            const id = generateHeadingId(children, headingIndex++);
            return (
              <h6 id={id} className="text-base font-bold mt-2 mb-1" {...props}>
                {children}
              </h6>
            );
          },
          p({ children, ...props }: any) {
            return (
              <p className="my-3 leading-7" {...props}>
                {children}
              </p>
            );
          },
          ul({ children, ...props }: any) {
            return (
              <ul className="my-3 ml-6 list-disc space-y-1" {...props}>
                {children}
              </ul>
            );
          },
          ol({ children, ...props }: any) {
            return (
              <ol className="my-3 ml-6 list-decimal space-y-1" {...props}>
                {children}
              </ol>
            );
          },
          li({ children, ...props }: any) {
            return (
              <li className="my-1 leading-7" {...props}>
                {children}
              </li>
            );
          },
          blockquote({ children, ...props }: any) {
            return (
              <blockquote className="my-4 pl-4 border-l-4 border-gray-300 dark:border-gray-600 italic text-gray-700 dark:text-gray-300" {...props}>
                {children}
              </blockquote>
            );
          },
          code({ inline, className, children, ...props }: any) {
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
          img({ src, alt, ...props }: any) {
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
          a({ children, href, ...props }: any) {
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
          table({ children, ...props }: any) {
            return (
              <div className="my-4 overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          thead({ children, ...props }: any) {
            return (
              <thead className="bg-gray-100 dark:bg-gray-800" {...props}>
                {children}
              </thead>
            );
          },
          th({ children, ...props }: any) {
            return (
              <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-bold" {...props}>
                {children}
              </th>
            );
          },
          td({ children, ...props }: any) {
            return (
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2" {...props}>
                {children}
              </td>
            );
          },
          hr(props: any) {
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
