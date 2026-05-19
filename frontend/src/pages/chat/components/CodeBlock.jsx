import React, { useState, Suspense, lazy, memo } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';

// Lazy load syntax highlighter for performance (code splitting)
const SyntaxHighlighter = lazy(() => import('react-syntax-highlighter/dist/esm/prism'));


const CodeBlockFallback = ({ code }) => (
  <pre className="code-block-fallback">
    <code>{code}</code>
  </pre>
);

const CodeBlock = memo(function CodeBlock({ node, inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false);
  
  // Extract language from className (format: language-xxx)
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'plaintext';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => console.error('Failed to copy code:', err));
  };

  // Inline code - no syntax highlighting needed
  if (inline) {
    return (
      <code className="inline-code-block">
        {children}
      </code>
    );
  }

  // Block code with syntax highlighting (lazy loaded)
  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-language-badge">{language}</span>
        <button
          type="button"
          className="code-copy-btn"
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy code'}
          aria-label={copied ? 'Code copied' : 'Copy code'}
        >
          {copied ? <FiCheck size={16} className="text-emerald-400" /> : <FiCopy size={16} />}
          <span className="copy-label">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      
      <Suspense fallback={<CodeBlockFallback code={code} />}>
        <div className="code-block-content">
          <SyntaxHighlighter
            language={language}
            showLineNumbers={code.split('\n').length > 5}
            wrapLines={true}
            customStyle={{
              margin: 0,
              padding: '12px',
              background: '#0b0914',
              fontSize: '13px',
              fontFamily: 'Fira Code, monospace',
              borderRadius: '0 0 8px 8px',
              overflow: 'auto',
              maxHeight: '400px',
            }}
            codeTagProps={{
              style: {
                fontFamily: 'Fira Code, monospace',
              },
            }}
            {...props}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </Suspense>
    </div>
  );
});

export default CodeBlock;
