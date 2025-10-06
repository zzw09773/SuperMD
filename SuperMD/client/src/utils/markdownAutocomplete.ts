import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';

// Markdown autocomplete snippets
const markdownCompletions = [
  // Headers
  { label: '# Heading 1', type: 'keyword', info: 'H1 標題', apply: '# ' },
  { label: '## Heading 2', type: 'keyword', info: 'H2 標題', apply: '## ' },
  { label: '### Heading 3', type: 'keyword', info: 'H3 標題', apply: '### ' },
  { label: '#### Heading 4', type: 'keyword', info: 'H4 標題', apply: '#### ' },
  { label: '##### Heading 5', type: 'keyword', info: 'H5 標題', apply: '##### ' },
  { label: '###### Heading 6', type: 'keyword', info: 'H6 標題', apply: '###### ' },

  // Text formatting
  { label: '**bold**', type: 'keyword', info: '粗體文字', apply: '**${1:text}**' },
  { label: '*italic*', type: 'keyword', info: '斜體文字', apply: '*${1:text}*' },
  { label: '~~strikethrough~~', type: 'keyword', info: '刪除線', apply: '~~${1:text}~~' },
  { label: '`code`', type: 'keyword', info: '行內程式碼', apply: '`${1:code}`' },

  // Links and images
  { label: '[link](url)', type: 'keyword', info: '超連結', apply: '[${1:text}](${2:url})' },
  { label: '![image](url)', type: 'keyword', info: '圖片', apply: '![${1:alt}](${2:url})' },

  // Lists
  { label: '- List item', type: 'keyword', info: '無序列表', apply: '- ' },
  { label: '1. Numbered list', type: 'keyword', info: '有序列表', apply: '1. ' },
  { label: '- [ ] Task list', type: 'keyword', info: '待辦事項', apply: '- [ ] ' },
  { label: '- [x] Done task', type: 'keyword', info: '已完成事項', apply: '- [x] ' },

  // Code blocks
  { label: '```code block```', type: 'keyword', info: '程式碼區塊', apply: '```${1:language}\n${2:code}\n```' },
  { label: '```javascript', type: 'keyword', info: 'JavaScript 程式碼', apply: '```javascript\n${1:code}\n```' },
  { label: '```python', type: 'keyword', info: 'Python 程式碼', apply: '```python\n${1:code}\n```' },
  { label: '```typescript', type: 'keyword', info: 'TypeScript 程式碼', apply: '```typescript\n${1:code}\n```' },
  { label: '```bash', type: 'keyword', info: 'Bash 指令', apply: '```bash\n${1:code}\n```' },

  // Blockquote and horizontal rule
  { label: '> Blockquote', type: 'keyword', info: '引用區塊', apply: '> ' },
  { label: '---', type: 'keyword', info: '水平分隔線', apply: '---\n' },

  // Tables
  {
    label: 'table',
    type: 'keyword',
    info: '表格',
    apply: '| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |'
  },

  // Mermaid diagrams
  {
    label: '```mermaid flowchart',
    type: 'keyword',
    info: 'Mermaid 流程圖',
    apply: '```mermaid\nflowchart TD\n    A[Start] --> B[Process]\n    B --> C[End]\n```'
  },
  {
    label: '```mermaid sequence',
    type: 'keyword',
    info: 'Mermaid 序列圖',
    apply: '```mermaid\nsequenceDiagram\n    participant A\n    participant B\n    A->>B: Message\n    B-->>A: Response\n```'
  },

  // Math formulas
  { label: '$inline math$', type: 'keyword', info: '行內數學公式', apply: '$${1:E=mc^2}$' },
  { label: '$$block math$$', type: 'keyword', info: '區塊數學公式', apply: '$$\n${1:E=mc^2}\n$$' },

  // Footnotes
  { label: '[^footnote]', type: 'keyword', info: '腳註引用', apply: '[^${1:1}]' },
  { label: '[^footnote]: text', type: 'keyword', info: '腳註定義', apply: '[^${1:1}]: ${2:Footnote content}' },
];

export function markdownAutocomplete(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w#*`\-\[\]>~$]/);

  if (!word) return null;

  // Don't show completions if cursor is not at the end of a word
  if (word.from === word.to && !context.explicit) {
    return null;
  }

  return {
    from: word.from,
    options: markdownCompletions,
    validFor: /^[\w#*`\-\[\]>~$]*$/,
  };
}
