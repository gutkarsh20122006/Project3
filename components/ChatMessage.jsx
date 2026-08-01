import React from 'react';
import { User, Bot } from 'lucide-react';
import ChunkSourceList from './ChunkSourceList';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-700'
        }`}
      >
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3 ${
          isUser
            ? 'bg-primary-600 text-white rounded-br-none'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
        }`}
      >
        <div className={`prose-custom ${isUser ? 'text-white' : ''}`}>
          {message.content.split('\n').map((paragraph, idx) => (
            <p key={idx} className={isUser ? 'text-white/90' : ''}>
              {paragraph}
            </p>
          ))}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <ChunkSourceList sources={message.sources} />
          </div>
        )}
      </div>
    </div>
  );
}
