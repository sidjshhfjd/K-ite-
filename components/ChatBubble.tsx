import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Message, Sender } from '../types';
import { FileText, Copy, Check } from 'lucide-react';
import { KiteIcon } from './KiteIcon';

interface ChatBubbleProps {
  message: Message;
  onImageClick?: (imageUrl: string) => void;
}

// Sub-component for handling Code Blocks with Copy functionality
const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);

  // Handle inline code
  if (inline || !match) {
    return (
      <code className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded-md font-mono text-[0.9em] border border-slate-200" {...props}>
        {children}
      </code>
    );
  }

  const language = match[1];

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-6 rounded-2xl overflow-hidden bg-[#1e293b] shadow-xl group/code">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f172a]/50 border-b border-slate-700/50 backdrop-blur-sm">
            {/* Left: Language Name */}
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                {language}
            </span>

            {/* Right: Copy Button */}
            <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg active:scale-95 duration-200"
                title="Sao chép mã"
            >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? <span className="text-emerald-400">Đã chép</span> : <span>Sao chép</span>}
            </button>
        </div>

        {/* Code Content */}
        <pre className="p-5 overflow-x-auto text-sm text-slate-50 font-mono custom-scrollbar bg-[#1e293b] m-0">
            <code className={className} {...props}>
                {children}
            </code>
        </pre>
    </div>
  );
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onImageClick }) => {
  const isUser = message.sender === Sender.User;
  const isImageAttachment = message.attachment?.mimeType.startsWith('image/');
  const [copied, setCopied] = React.useState(false);

  // Check if AI is "thinking" (message exists but has no text/attachment/error yet)
  const isThinking = !isUser && !message.text && !message.attachment && !message.isError;
  
  const imageUrl = isImageAttachment && message.attachment 
    ? `data:${message.attachment.mimeType};base64,${message.attachment.data}` 
    : '';

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group animate-in slide-in-from-bottom-2 duration-300`}>
      
      {/* AI Icon Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 mr-4 mt-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
            <KiteIcon className="w-5 h-5" />
          </div>
        </div>
      )}

      {/* Main Content Container - Stacked Vertically */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        
        {/* 1. ATTACHMENT SECTION (Always on Top) */}
        {message.attachment && (
            <div className={`mb-2 ${isUser ? 'ml-auto' : 'mr-auto'}`}>
                {isImageAttachment ? (
                    <div 
                        className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-w-sm cursor-zoom-in group/image bg-white"
                        onClick={() => onImageClick?.(imageUrl)}
                    >
                        <img 
                            src={imageUrl}
                            alt="Uploaded content" 
                            className="w-full h-auto object-cover transition-transform duration-300 group-hover/image:scale-105"
                        />
                    </div>
                ) : (
                    // File Attachment Card
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 shadow-sm bg-white max-w-sm">
                        <div className="p-2 rounded-lg flex-shrink-0 bg-blue-50 text-blue-600">
                            <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-slate-700">
                                {message.attachment.fileName || 'Tài liệu đính kèm'}
                            </p>
                            <p className="text-[10px] uppercase truncate text-slate-400">
                                {message.attachment.mimeType.split('/')[1] || 'FILE'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* 2. TEXT CONTENT SECTION (Bottom) */}
        {(message.text || isThinking || message.isError) && (
            <div
                className={`relative ${
                isUser
                    ? 'bg-[#0b57d0] text-white rounded-[22px] rounded-tr-[4px] px-4 py-2.5 shadow-sm text-[15px] leading-relaxed'
                    : 'bg-transparent text-slate-800 w-full text-base leading-relaxed' 
                } ${message.isError ? 'bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3' : ''}`}
                style={{ fontFamily: isUser ? 'Arial, sans-serif' : undefined }}
            >
                {isThinking ? (
                    // Thinking Animation
                    <div className="flex items-center space-x-1 h-6">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    </div>
                ) : isUser ? (
                // User messages are simple text with Arial font
                <p className="whitespace-pre-wrap">{message.text}</p>
                ) : (
                // AI messages with Rich Markdown & Math
                <div className="w-full">
                    <div className="prose prose-slate prose-lg max-w-none prose-p:leading-7 prose-headings:font-bold prose-strong:font-bold prose-strong:text-slate-900">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                        code: CodeBlock,
                        table({children}) {
                            return (
                            <div className="overflow-x-auto my-6 rounded-xl border border-slate-200 shadow-sm bg-white">
                                <table className="w-full text-left border-collapse text-sm">
                                {children}
                                </table>
                            </div>
                            )
                        },
                        thead({children}) {
                            return <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">{children}</thead>
                        },
                        th({children}) {
                            return <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">{children}</th>
                        },
                        td({children}) {
                            return <td className="px-6 py-4 border-b border-slate-100 last:border-0 text-slate-600">{children}</td>
                        },
                        h1({children}) {
                            return <h1 className="text-3xl font-extrabold text-slate-900 mt-8 mb-4 pb-2 border-b border-slate-200">{children}</h1>
                        },
                        h2({children}) {
                            return <h2 className="text-2xl font-bold text-slate-900 mt-6 mb-3">{children}</h2>
                        },
                        h3({children}) {
                            return <h3 className="text-xl font-bold text-slate-800 mt-5 mb-2">{children}</h3>
                        },
                        blockquote({children}) {
                            return <blockquote className="border-l-4 border-blue-500 pl-4 py-2 italic text-slate-600 bg-white shadow-sm rounded-r-lg my-4">{children}</blockquote>
                        },
                        ul({children}) {
                            return <ul className="list-disc list-outside ml-5 space-y-2 my-4 marker:text-slate-400">{children}</ul>
                        },
                        ol({children}) {
                            return <ol className="list-decimal list-outside ml-5 space-y-2 my-4 marker:text-slate-400">{children}</ol>
                        },
                        p({children}) {
                            return <p className="mb-4 last:mb-0">{children}</p>
                        }
                        }}
                    >
                        {message.text}
                    </ReactMarkdown>
                    </div>
                    
                    {/* Action Bar for AI Message */}
                    {!message.isError && message.text && (
                    <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pl-1">
                        <button 
                            onClick={handleCopyMessage}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Sao chép toàn bộ"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <span className="text-[10px] text-slate-300">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    )}
                </div>
                )}
                
                {/* Timestamp for User (Inside the blue bubble) */}
                {isUser && (
                <span className="text-[10px] absolute bottom-1 right-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                )}
            </div>
        )}
      </div>
    </div>
  );
};