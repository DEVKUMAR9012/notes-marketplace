import React, { memo, Suspense, lazy } from 'react';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

// Lazy load react-markdown for performance (it's large)
const ReactMarkdown = lazy(() => import('react-markdown'));
const CodeBlock = lazy(() => import('./CodeBlock'));

// Fallback plain text renderer during lazy load
const MarkdownFallback = ({ text }) => (
  <div className="markdown-fallback">
    {text}
  </div>
);

const MarkdownMessage = memo(function MarkdownMessage({ content, className = '' }) {
  if (!content || typeof content !== 'string') {
    return <span className={className}>{content}</span>;
  }

  // Check if content looks like markdown (has markdown patterns)
  const hasMarkdown = /[*_`#[\]()!]|```|---|\n\s*[-*+]|^\s*\d+\.|> /.test(content);

  // If no markdown patterns, render as plain text for performance
  if (!hasMarkdown) {
    return <span className={`markdown-message ${className}`}>{content}</span>;
  }

  return (
    <div className={`markdown-message ${className}`}>
      <Suspense fallback={<MarkdownFallback text={content} />}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={{
            code: CodeBlock,
            h1: ({ node, children, ...props }) => <h1 className="markdown-h1" {...props}>{children}</h1>,
            h2: ({ node, children, ...props }) => <h2 className="markdown-h2" {...props}>{children}</h2>,
            h3: ({ node, children, ...props }) => <h3 className="markdown-h3" {...props}>{children}</h3>,
            // Custom style lists
            ul: ({ node, ...props }) => <ul className="markdown-ul" {...props} />,
            ol: ({ node, ...props }) => <ol className="markdown-ol" {...props} />,
            li: ({ node, ...props }) => <li className="markdown-li" {...props} />,
            // Custom style blockquote
            blockquote: ({ node, ...props }) => <blockquote className="markdown-blockquote" {...props} />,
            // Custom style links (no target=_blank for security)
            a: ({ node, href, children, ...props }) => (
              <a 
                href={href} 
                className="markdown-link"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!href?.startsWith('http')) {
                    e.preventDefault();
                  }
                }}
                {...props} 
              >
                {children}
              </a>
            ),
            // Custom style tables
            table: ({ node, ...props }) => <table className="markdown-table" {...props} />,
            thead: ({ node, ...props }) => <thead className="markdown-thead" {...props} />,
            tbody: ({ node, ...props }) => <tbody className="markdown-tbody" {...props} />,
            tr: ({ node, ...props }) => <tr className="markdown-tr" {...props} />,
            th: ({ node, ...props }) => <th className="markdown-th" {...props} />,
            td: ({ node, ...props }) => <td className="markdown-td" {...props} />,
            // Custom style paragraph
            p: ({ node, ...props }) => <p className="markdown-p" {...props} />,
            // Custom style hr
            hr: ({ node, ...props }) => <hr className="markdown-hr" {...props} />,
          }}
          skipHtml={true}
          disallowedElements={['script', 'iframe', 'img']}
          unwrapDisallowed={false}
        >
          {content}
        </ReactMarkdown>
      </Suspense>
    </div>
  );
});

export default MarkdownMessage;
