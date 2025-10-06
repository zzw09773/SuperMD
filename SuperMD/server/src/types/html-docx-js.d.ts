declare module 'html-docx-js/dist/html-docx' {
  export function asBlob(html: string, options?: unknown): Promise<Blob>;
}
