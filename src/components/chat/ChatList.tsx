import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

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

interface ChatListProps {
  user: User;
  chats: Chat[];
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onSettings: () => void;
}

export default function ChatList({
  user,
  chats,
  selectedChat,
  onSelectChat,
  onNewChat,
  onNewGroup,
  onSettings
}: ChatListProps) {
  return (
    <div className="w-full md:w-80 flex flex-col glass border-r border-purple-500/20">
      <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500">
              {user.nickname[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{user.nickname}</h2>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={onNewChat}>
            <Icon name="MessageSquarePlus" size={20} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNewGroup}>
            <Icon name="Users" size={20} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onSettings}>
            <Icon name="Settings" size={20} />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {chats.map(chat => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className={`p-4 border-b border-purple-500/10 cursor-pointer hover:bg-purple-500/10 transition-colors ${
              selectedChat?.id === chat.id ? 'bg-purple-500/20' : ''
            }`}
          >
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
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold truncate">{chat.name || 'Безымянный чат'}</h3>
                  {chat.last_message_time && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(chat.last_message_time).toLocaleTimeString('ru', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
                {chat.last_message && (
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.last_message}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}