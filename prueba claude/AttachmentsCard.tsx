// AttachmentsCard.tsx
import { Attachment } from './types';

interface AttachmentsCardProps {
  attachments: Attachment[];
  uploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteAttachment: (attId: string) => void;
}

export const AttachmentsCard = ({
  attachments,
  uploading,
  onFileUpload,
  onDeleteAttachment,
}: AttachmentsCardProps) => {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col mb-5">
      <div className="flex justify-between items-center mb-2.5">
        <h3 className="m-0 text-white">📎 Archivos Adjuntos</h3>
        <label className="bg-blue-500 text-white py-1 px-2.5 rounded cursor-pointer text-xs hover:bg-blue-600 transition-colors">
          {uploading ? 'Subiendo...' : '+ Subir Archivo'}
          <input 
            type="file" 
            onChange={onFileUpload} 
            className="hidden" 
            disabled={uploading} 
          />
        </label>
      </div>
      
      {attachments.length === 0 ? (
        <p className="text-zinc-600 text-xs">No hay archivos.</p>
      ) : (
        <ul className="list-none p-0 m-0">
          {attachments.map(att => (
            <li 
              key={att.id} 
              className="flex justify-between bg-zinc-950 p-2 mb-1 rounded"
            >
              <a 
                href={att.file_url} 
                target="_blank" 
                rel="noreferrer" 
                className="text-blue-500 no-underline text-xs hover:text-blue-400 transition-colors"
              >
                {att.file_name}
              </a>
              <button 
                onClick={() => onDeleteAttachment(att.id)}
                className="border-none bg-transparent text-red-600 cursor-pointer hover:text-red-500 transition-colors"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};