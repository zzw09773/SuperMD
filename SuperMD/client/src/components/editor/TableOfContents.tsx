import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

const TableOfContents = ({ content }: TableOfContentsProps) => {
  const [toc, setToc] = useState<TocItem[]>([]);

  useEffect(() => {
    const headings: TocItem[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = `heading-${index}-${text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')}`;
        headings.push({ id, text, level });
      }
    });

    setToc(headings);
  }, [content]);

  if (toc.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
        目錄為空，請在文檔中添加標題
      </div>
    );
  }

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">目錄</h3>
      <nav className="space-y-1">
        {toc.map((item, index) => (
          <button
            key={index}
            onClick={() => scrollToHeading(item.id)}
            className={`block w-full text-left py-1 px-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ${
              item.level === 1 ? 'font-bold' : ''
            } ${
              item.level === 2 ? 'pl-4' : ''
            } ${
              item.level === 3 ? 'pl-6' : ''
            } ${
              item.level === 4 ? 'pl-8' : ''
            } ${
              item.level === 5 ? 'pl-10' : ''
            } ${
              item.level === 6 ? 'pl-12' : ''
            } text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400`}
          >
            {item.text}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TableOfContents;
