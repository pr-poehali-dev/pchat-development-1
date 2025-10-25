import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const AUTH_URL = 'https://functions.poehali.dev/520ad929-c909-4e2b-8a6a-23d0f8648a5d';
const CHATS_URL = 'https://functions.poehali.dev/4d069476-3336-4644-9ef7-bb70d595e5ae';
const PROFILE_URL = 'https://functions.poehali.dev/da9b0d09-13d2-409c-a27e-f8a49aef114e';
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

interface Member {
  id: number;
  username: string;
  nickname: string;
  avatar_url?: string;
  creator_id?: number;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showGroupSettingsDialog, setShowGroupSettingsDialog] = useState(false);
  
  const [newChatUsername, setNewChatUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  
  const [profileNickname, setProfileNickname] = useState('');
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('pchat_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadChats();
      setProfileNickname(user.nickname);
      setHideOnlineStatus(user.hide_online_status || false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
    }
  }, [selectedChat]);

  const handleAuth = async () => {
    try {
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isLogin ? 'login' : 'register',
          username,
          password,
          nickname: nickname || username
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUser(data);
        localStorage.setItem('pchat_user', JSON.stringify(data));
        toast({ title: isLogin ? 'Добро пожаловать!' : 'Аккаунт создан!' });
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка подключения', variant: 'destructive' });
    }
  };

  const loadChats = async () => {
    try {
      const response = await fetch(CHATS_URL, {
        headers: { 'X-User-Id': user?.id.toString() || '' }
      });
      const data = await response.json();
      setChats(data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const response = await fetch(`${CHATS_URL}?chatId=${chatId}`, {
        headers: { 'X-User-Id': user?.id.toString() || '' }
      });
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const createChat = async () => {
    try {
      const response = await fetch(CHATS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id.toString() || ''
        },
        body: JSON.stringify({
          action: 'create_chat',
          username: newChatUsername
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({ title: 'Чат создан!' });
        setShowNewChatDialog(false);
        setNewChatUsername('');
        loadChats();
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка создания чата', variant: 'destructive' });
    }
  };

  const createGroup = async () => {
    try {
      const membersList = groupMembers.split(',').map(m => m.trim()).filter(m => m);
      
      const response = await fetch(CHATS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id.toString() || ''
        },
        body: JSON.stringify({
          action: 'create_group',
          name: groupName,
          members: membersList
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({ title: 'Группа создана!' });
        setShowNewGroupDialog(false);
        setGroupName('');
        setGroupMembers('');
        loadChats();
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка создания группы', variant: 'destructive' });
    }
  };

  const loadGroupMembers = async (chatId: number) => {
    try {
      const response = await fetch(CHATS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id.toString() || ''
        },
        body: JSON.stringify({
          action: 'get_group_members',
          chat_id: chatId
        })
      });
      const data = await response.json();
      setMembers(data);
      setShowMembersDialog(true);
    } catch (error) {
      toast({ title: 'Ошибка загрузки участников', variant: 'destructive' });
    }
  };

  const leaveGroup = async () => {
    if (!selectedChat) return;
    
    try {
      await fetch(CHATS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id.toString() || ''
        },
        body: JSON.stringify({
          action: 'leave_group',
          chat_id: selectedChat.id
        })
      });
      
      toast({ title: 'Вы покинули группу' });
      setSelectedChat(null);
      loadChats();
    } catch (error) {
      toast({ title: 'Ошибка', variant: 'destructive' });
    }
  };

  const updateProfile = async () => {
    try {
      const response = await fetch(PROFILE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id.toString() || ''
        },
        body: JSON.stringify({
          action: 'update_profile',
          nickname: profileNickname,
          hide_online_status: hideOnlineStatus
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUser(data);
        localStorage.setItem('pchat_user', JSON.stringify(data));
        toast({ title: 'Профиль обновлён!' });
        setShowSettingsDialog(false);
      }
    } catch (error) {
      toast({ title: 'Ошибка обновления', variant: 'destructive' });
    }
  };

  const logout = async () => {
    try {
      await fetch(PROFILE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id.toString() || ''
        },
        body: JSON.stringify({ action: 'logout' })
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('pchat_user');
    setUser(null);
  };

  const deleteAccount = async () => {
    if (!confirm('Вы уверены? Все ваши данные будут удалены безвозвратно!')) return;
    
    try {
      await fetch(PROFILE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id.toString() || ''
        },
        body: JSON.stringify({ action: 'delete_account' })
      });
      
      localStorage.removeItem('pchat_user');
      setUser(null);
      toast({ title: 'Аккаунт удалён' });
    } catch (error) {
      toast({ title: 'Ошибка удаления', variant: 'destructive' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        
        const uploadResponse = await fetch(UPLOAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64 })
        });
        
        const uploadData = await uploadResponse.json();
        
        if (uploadData.url) {
          await fetch(CHATS_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': user?.id.toString() || ''
            },
            body: JSON.stringify({
              action: 'send_message',
              chat_id: selectedChat.id,
              content: '📎 Изображение',
              file_url: uploadData.url
            })
          });
          
          loadMessages(selectedChat.id);
          loadChats();
          toast({ title: 'Файл отправлен!' });
        }
      } catch (error) {
        toast({ title: 'Ошибка загрузки файла', variant: 'destructive' });
      }
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    try {
      await fetch(CHATS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id.toString() || ''
        },
        body: JSON.stringify({
          action: 'send_message',
          chat_id: selectedChat.id,
          content: newMessage
        })
      });
      
      setNewMessage('');
      loadMessages(selectedChat.id);
      loadChats();
    } catch (error) {
      toast({ title: 'Ошибка отправки', variant: 'destructive' });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <Card className="w-full max-w-md p-8 glass-strong border-purple-500/30 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">PChat</h1>
            <p className="text-muted-foreground">Современный мессенджер</p>
          </div>
          
          <div className="space-y-4">
            <Input
              placeholder="Юзернейм"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="glass border-purple-500/30"
            />
            <Input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass border-purple-500/30"
            />
            {!isLogin && (
              <Input
                placeholder="Имя (опционально)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="glass border-purple-500/30"
              />
            )}
            
            <Button onClick={handleAuth} className="w-full bg-primary hover:bg-primary/90">
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
            </Button>
            
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-sm text-primary hover:underline"
            >
              {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Есть аккаунт? Войдите'}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div className={`w-full md:w-96 ${selectedChat ? 'hidden md:flex' : 'flex'} flex-col border-r border-purple-500/30`}>
        <div className="p-4 border-b border-purple-500/30 glass-strong flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="border-2 border-primary">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.nickname[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{user.nickname}</h2>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowNewChatDialog(true)}
              className="hover:bg-purple-500/20"
              title="Новый чат"
            >
              <Icon name="UserPlus" size={20} />
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowNewGroupDialog(true)}
              className="hover:bg-purple-500/20"
              title="Новая группа"
            >
              <Icon name="Users" size={20} />
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowSettingsDialog(true)}
              className="hover:bg-purple-500/20"
              title="Настройки"
            >
              <Icon name="Settings" size={20} />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-3 rounded-lg cursor-pointer transition-all mb-1 ${
                  selectedChat?.id === chat.id
                    ? 'glass-strong border border-primary'
                    : 'hover:bg-purple-500/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="border border-purple-500/30">
                    <AvatarFallback className="bg-purple-600">
                      <Icon name={chat.is_group ? "Users" : "User"} size={20} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{chat.name || `Чат ${chat.id}`}</h3>
                    <p className="text-sm text-muted-foreground truncate">{chat.last_message || 'Нет сообщений'}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {chats.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Icon name="MessageCircle" size={48} className="mx-auto mb-2 opacity-50" />
                <p>Нет чатов</p>
                <p className="text-sm">Создайте новый</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className={`flex-1 ${selectedChat ? 'flex' : 'hidden md:flex'} flex-col`}>
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-purple-500/30 glass-strong flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden hover:bg-purple-500/20"
                >
                  <Icon name="ArrowLeft" size={20} />
                </Button>
                
                <Avatar className="border border-purple-500/30">
                  <AvatarFallback className="bg-purple-600">
                    <Icon name={selectedChat.is_group ? "Users" : "User"} size={20} />
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h2 className="font-semibold">{selectedChat.name || `Чат ${selectedChat.id}`}</h2>
                  <p className="text-xs text-muted-foreground">онлайн</p>
                </div>
              </div>
              
              {selectedChat.is_group && (
                <div className="flex gap-1">
                  {selectedChat.creator_id === user.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowGroupSettingsDialog(true)}
                      className="hover:bg-purple-500/20"
                      title="Настройки группы"
                    >
                      <Icon name="Settings" size={20} />
                    </Button>
                  )}
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => loadGroupMembers(selectedChat.id)}
                    className="hover:bg-purple-500/20"
                    title="Участники"
                  >
                    <Icon name="Users" size={20} />
                  </Button>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={leaveGroup}
                    className="hover:bg-purple-500/20 text-destructive"
                    title="Покинуть группу"
                  >
                    <Icon name="LogOut" size={20} />
                  </Button>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl p-3 ${
                        msg.sender_id === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'glass-strong'
                      }`}
                    >
                      {selectedChat.is_group && msg.sender_id !== user.id && (
                        <p className="text-xs font-semibold mb-1 text-primary">{msg.sender_name}</p>
                      )}
                      <p className="break-words">{msg.content}</p>
                      {msg.file_url && (
                        <img src={msg.file_url} alt="attachment" className="mt-2 rounded-lg max-w-full" />
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-xs opacity-70">
                          {new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {msg.sender_id === user.id && (
                          <Icon name={msg.is_read ? 'CheckCheck' : 'Check'} size={14} className={msg.is_read ? 'text-blue-400' : 'opacity-70'} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {messages.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="MessageSquare" size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Начните общение</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-purple-500/30 glass-strong">
              <div className="flex gap-2">
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="hover:bg-purple-500/20"
                >
                  <Icon name="Paperclip" size={20} />
                </Button>
                
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
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Icon name="MessagesSquare" size={64} className="mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-semibold mb-2">Выберите чат</h3>
              <p>Выберите чат из списка, чтобы начать общение</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="glass-strong border-purple-500/30">
          <DialogHeader>
            <DialogTitle>Новый чат</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Юзернейм собеседника"
              value={newChatUsername}
              onChange={(e) => setNewChatUsername(e.target.value)}
              className="glass border-purple-500/30"
            />
            <Button onClick={createChat} className="w-full bg-primary hover:bg-primary/90">
              Создать
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent className="glass-strong border-purple-500/30">
          <DialogHeader>
            <DialogTitle>Новая группа</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название группы</Label>
              <Input
                placeholder="Моя группа"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="glass border-purple-500/30 mt-1"
              />
            </div>
            <div>
              <Label>Участники (через запятую)</Label>
              <Textarea
                placeholder="user1, user2, user3"
                value={groupMembers}
                onChange={(e) => setGroupMembers(e.target.value)}
                className="glass border-purple-500/30 mt-1"
              />
            </div>
            <Button onClick={createGroup} className="w-full bg-primary hover:bg-primary/90">
              Создать группу
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="glass-strong border-purple-500/30">
          <DialogHeader>
            <DialogTitle>Участники группы</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-500/10">
                  <Avatar className="border border-purple-500/30">
                    <AvatarFallback className="bg-purple-600">
                      {member.nickname[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{member.nickname}</p>
                    <p className="text-xs text-muted-foreground">@{member.username}</p>
                  </div>
                  {member.creator_id === member.id && (
                    <Icon name="Crown" size={16} className="text-yellow-400" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="glass-strong border-purple-500/30">
          <DialogHeader>
            <DialogTitle>Настройки профиля</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ник</Label>
              <Input
                value={profileNickname}
                onChange={(e) => setProfileNickname(e.target.value)}
                className="glass border-purple-500/30 mt-1"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Скрыть статус онлайн</Label>
              <Switch
                checked={hideOnlineStatus}
                onCheckedChange={setHideOnlineStatus}
              />
            </div>
            
            <Button onClick={updateProfile} className="w-full bg-primary hover:bg-primary/90">
              Сохранить
            </Button>
            
            <Button onClick={logout} variant="outline" className="w-full">
              Выйти из аккаунта
            </Button>
            
            <Button onClick={deleteAccount} variant="destructive" className="w-full">
              Удалить аккаунт
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}