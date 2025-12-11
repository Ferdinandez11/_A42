// BudgetChatPanel.tsx
import { useRef, useEffect } from 'react';
import type { Message } from '@/crm/pages/budgetTypes';

interface BudgetChatPanelProps {
  messages: Message[];
  newMessage: string;
  onNewMessageChange: (value: string) => void;
  onSendMessage: () => void;
}

export const BudgetChatPanel = ({
  messages,
  newMessage,
  onNewMessageChange,
  onSendMessage,
}: BudgetChatPanelProps) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSendMessage();
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col max-h-[80vh] mb-0">
      <h3 className="text-white border-b border-zinc-800 pb-2.5 m-0">
        💬 Chat
      </h3>
      
      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 mt-4">
        {messages.map(msg => {
          const isMe = msg.profiles?.role === 'client';
          return (
            <div 
              key={msg.id}
              className={`max-w-[85%] p-2.5 px-4 rounded-xl ${
                isMe 
                  ? 'self-end bg-blue-500 text-white' 
                  : 'self-start bg-zinc-700 text-white'
              }`}
            >
              {msg.content}
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      
      <div className="mt-4 flex gap-2.5">
        <input 
          type="text" 
          value={newMessage} 
          onChange={(e) => onNewMessageChange(e.target.value)} 
          onKeyDown={handleKeyDown}
          placeholder="Mensaje..."
          className="flex-1 p-2.5 rounded-md bg-zinc-950 border-none text-white"
        />
        <button 
          onClick={onSendMessage}
          className="px-4 bg-blue-500 border-none rounded-md text-white cursor-pointer hover:bg-blue-600 transition-colors"
        >
          ➤
        </button>
      </div>
    </div>
  );
};