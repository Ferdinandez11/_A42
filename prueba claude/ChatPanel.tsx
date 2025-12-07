// ChatPanel.tsx
import { useRef, useEffect } from 'react';
import { Message } from './types';

interface ChatPanelProps {
  messages: Message[];
  newMessage: string;
  onNewMessageChange: (value: string) => void;
  onSendMessage: () => void;
}

export const ChatPanel = ({
  messages,
  newMessage,
  onNewMessageChange,
  onSendMessage,
}: ChatPanelProps) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isMyMessage = (role: string) => role === 'admin' || role === 'employee';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSendMessage();
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col max-h-[90vh] mb-0">
      <h3 className="text-white border-b border-zinc-800 pb-2.5 mb-0">💬 Chat</h3>
      
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 mt-4">
        {messages.map(msg => {
          const amITheSender = isMyMessage(msg.profiles?.role || '');
          return (
            <div 
              key={msg.id} 
              className={`max-w-[85%] p-2.5 rounded-lg ${
                amITheSender 
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
          onChange={e => onNewMessageChange(e.target.value)} 
          onKeyDown={handleKeyDown}
          className="flex-1 p-2.5 rounded-md border-none bg-white text-black"
          placeholder="Responder..." 
        />
        <button 
          onClick={onSendMessage}
          className="bg-blue-500 text-white border-none px-4 rounded-md cursor-pointer hover:bg-blue-600 transition-colors"
        >
          ➤
        </button>
      </div>
    </div>
  );
};