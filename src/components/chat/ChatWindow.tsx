import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const CHATS_URL = 'https://functions.poehali.dev/4d069476-3336-4644-9ef7-bb70d595e5ae';
const UPLOAD_URL = 'https://functions.poehali.dev/10ae2b90-4afe-4755-9a60-3bf95bb2d159';

interface User {
  id: number;
  username: string;
  nickname: string;
  avatar_url?: string;
  hide_online_status?: boolean;
}

interface Chat {
  id: number;
  name?: string;
  avatar_url?: string;
  is_group: boolean;
  last_message?: string;
  last_message_time?: string;
  creator_id?: number;
}

interface Message {
  id: number;
  content: string;
  sender_id: number;
  sender_name: string;
  is_read: boolean;
  created_at: string;
  file_url?: string;
}

interface ChatWindowProps {
  user: User;
  chat: Chat;
  messages: Message[];
  onMessagesUpdate: () => void;
  onShowMembers: () => void;
  onShowGroupSettings: () => void;
}

export default function ChatWindow({
  user,
  chat,
  messages,
  onMessagesUpdate,
  onShowMembers,
  onShowGroupSettings
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await fetch(CHATS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString()
        },
        body: JSON.stringify({
          action: 'send_message',
          chat_id: chat.id,
          content: newMessage
        })
      });

      setNewMessage('');
      onMessagesUpdate();
    } catch (error) {
      toast({ title: 'Ошибка отправки', variant: 'destructive' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: {
          'X-User-Id': user.id.toString()
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        await fetch(CHATS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.id.toString()
          },
          body: JSON.stringify({
            action: 'send_message',
            chat_id: chat.id,
            content: file.name,
            file_url: data.url
          })
        });

        onMessagesUpdate();
        toast({ title: 'Файл отправлен!' });
      } else {
        toast({ title: 'Ошибка загрузки', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка загрузки файла', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="p-4 border-b border-purple-500/20 flex items-center justify-between glass">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-400">
              {chat.is_group ? (
                <Icon name="Users" size={20} />
              ) : (
                chat.name?.[0].toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{chat.name}</h2>
            {chat.is_group && (
              <button
                onClick={onShowMembers}
                className="text-xs text-purple-300 hover:text-purple-200"
              >
                Участники
              </button>
            )}
          </div>
        </div>

        {chat.is_group && (
          <Button variant="ghost" size="icon" onClick={onShowGroupSettings}>
            <Icon name="Settings" size={20} />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  msg.sender_id === user.id
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                    : 'glass-strong'
                }`}
              >
                {chat.is_group && msg.sender_id !== user.id && (
                  <p className="text-xs font-semibold mb-1 text-purple-300">
                    {msg.sender_name}
                  </p>
                )}
                {msg.file_url ? (
                  <a
                    href={msg.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Icon name="File" size={16} />
                    {msg.content}
                  </a>
                ) : (
                  <p>{msg.content}</p>
                )}
                <p className={`text-xs mt-1 ${
                  msg.sender_id === user.id ? 'text-purple-100' : 'text-muted-foreground'
                }`}>
                  {new Date(msg.created_at).toLocaleTimeString('ru', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-purple-500/20 glass">
        <div className="flex gap-2">
          <label>
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="ghost" size="icon" className="cursor-pointer" asChild>
              <span>
                <Icon name="Paperclip" size={20} />
              </span>
            </Button>
          </label>

          <Input
            placeholder="Сообщение..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="glass border-purple-500/30"
          />

          <Button onClick={sendMessage} className="bg-primary hover:bg-primary/90">
            <Icon name="Send" size={20} />
          </Button>
        </div>
      </div>
    </>
  );
}
