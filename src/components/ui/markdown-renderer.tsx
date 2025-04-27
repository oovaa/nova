import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const sampleMarkdown = `# Welcome to Markdown Renderer\n\nThis is a **Markdown** example with support for:\n\n- **Bold** and *Italic* text\n- Lists\n- [Links](https://example.com)\n\nEnjoy!`

export const MarkdownRenderer = () => (
  <div className='markdown-container'>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{sampleMarkdown}</ReactMarkdown>
  </div>
)

export default MarkdownRenderer
