import { useState, useEffect, useRef } from 'react';
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
  is_edited?: boolean;
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
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const previousMessagesCount = useRef(messages.length);
  const { toast } = useToast();

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      console.log('Audio notification failed');
    }
  };

  useEffect(() => {
    if (messages.length > previousMessagesCount.current) {
      const newMessages = messages.slice(previousMessagesCount.current);
      const hasNewMessageFromOthers = newMessages.some(msg => msg.sender_id !== user.id);
      
      if (hasNewMessageFromOthers) {
        playNotificationSound();
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Новое сообщение', {
            body: newMessages[newMessages.length - 1].content,
            icon: chat.avatar_url,
            tag: `chat-${chat.id}`
          });
        }
      }
    }
    previousMessagesCount.current = messages.length;
  }, [messages, user.id, chat.id, chat.avatar_url]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    pollingInterval.current = setInterval(() => {
      onMessagesUpdate();
    }, 2000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [chat.id, onMessagesUpdate]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewFile({ file, url });
    } else {
      uploadFile(file);
    }
    
    e.target.value = '';
  };

  const uploadFile = async (file: File, caption?: string) => {
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
            content: caption || file.name,
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

  const sendPreviewedImage = async () => {
    if (!previewFile) return;
    await uploadFile(previewFile.file, imageCaption.trim() || undefined);
    URL.revokeObjectURL(previewFile.url);
    setPreviewFile(null);
    setImageCaption('');
  };

  const cancelPreview = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile.url);
      setPreviewFile(null);
      setImageCaption('');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({ title: 'Ошибка доступа к микрофону', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice.webm');

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
            content: 'Голосовое сообщение',
            file_url: data.url
          })
        });

        onMessagesUpdate();
        toast({ title: 'Голосовое сообщение отправлено!' });
      } else {
        toast({ title: 'Ошибка загрузки', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка отправки голосового', variant: 'destructive' });
    }
  };

  const editMessage = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  };

  const saveEdit = async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    try {
      await fetch(CHATS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString()
        },
        body: JSON.stringify({
          action: 'edit_message',
          message_id: editingMessageId,
          content: editingContent
        })
      });

      setEditingMessageId(null);
      setEditingContent('');
      onMessagesUpdate();
    } catch (error) {
      toast({ title: 'Ошибка редактирования', variant: 'destructive' });
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!confirm('Удалить сообщение?')) return;

    try {
      await fetch(CHATS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString()
        },
        body: JSON.stringify({
          action: 'delete_message',
          message_id: messageId
        })
      });

      onMessagesUpdate();
    } catch (error) {
      toast({ title: 'Ошибка удаления', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="p-4 border-b border-purple-500/20 flex items-center justify-between glass">
        <div className="flex items-center gap-3">
          <Avatar>
            {chat.avatar_url ? (
              <img src={chat.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-400">
                {chat.is_group ? (
                  <Icon name="Users" size={20} />
                ) : (
                  (chat.name && chat.name.length > 0) ? chat.name[0].toUpperCase() : '?'
                )}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h2 className="font-semibold">{chat.name || 'Безымянный чат'}</h2>
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
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={onShowMembers}>
              <Icon name="Users" size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onShowGroupSettings}>
              <Icon name="Settings" size={20} />
            </Button>
          </div>
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
                {editingMessageId === msg.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="glass border-purple-500/30"
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>Сохранить</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingMessageId(null)}>Отмена</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.file_url ? (
                      msg.content === 'Голосовое сообщение' ? (
                        <div className="flex items-center gap-2">
                          <Icon name="Mic" size={16} />
                          <audio controls src={msg.file_url} className="max-w-xs" />
                        </div>
                      ) : msg.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <div className="space-y-1">
                          <img 
                            src={msg.file_url} 
                            alt={msg.content} 
                            className="max-w-xs rounded-lg cursor-pointer"
                            onClick={() => window.open(msg.file_url, '_blank')}
                          />
                          {msg.content && msg.content !== msg.file_url.split('/').pop() && (
                            <p className="text-sm">{msg.content}</p>
                          )}
                        </div>
                      ) : (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Icon name="File" size={16} />
                          {msg.content}
                        </a>
                      )
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </>
                )}
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-xs ${
                    msg.sender_id === user.id ? 'text-purple-100' : 'text-muted-foreground'
                  }`}>
                    {new Date(msg.created_at).toLocaleTimeString('ru', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {msg.is_edited && ' (изменено)'}
                  </p>
                  {msg.sender_id === user.id && !msg.file_url && editingMessageId !== msg.id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => editMessage(msg)}
                      >
                        <Icon name="Pencil" size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteMessage(msg.id)}
                      >
                        <Icon name="Trash2" size={12} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {previewFile && (
        <div className="p-4 border-t border-purple-500/20 glass space-y-3">
          <div className="relative inline-block">
            <img 
              src={previewFile.url} 
              alt="Preview" 
              className="max-h-48 rounded-lg border border-purple-500/30"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
              onClick={cancelPreview}
            >
              <Icon name="X" size={16} />
            </Button>
          </div>
          <Input
            value={imageCaption}
            onChange={(e) => setImageCaption(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendPreviewedImage()}
            placeholder="Добавить подпись..."
            className="glass border-purple-500/30"
          />
          <div className="flex gap-2">
            <Button 
              onClick={sendPreviewedImage} 
              className="bg-gradient-to-r from-purple-500 to-blue-500"
            >
              <Icon name="Send" size={16} className="mr-2" />
              Отправить
            </Button>
            <Button variant="outline" onClick={cancelPreview}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-purple-500/20 glass">
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10">
              <Icon name="Paperclip" size={20} />
            </div>
          </label>

          <Button
            variant="ghost"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            className={isRecording ? 'text-red-500' : ''}
          >
            <Icon name={isRecording ? 'StopCircle' : 'Mic'} size={20} />
          </Button>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Введите сообщение..."
            className="flex-1 glass border-purple-500/30"
          />

          <Button onClick={sendMessage} className="bg-gradient-to-r from-purple-500 to-blue-500">
            <Icon name="Send" size={20} />
          </Button>
        </div>
      </div>
    </>
  );
}