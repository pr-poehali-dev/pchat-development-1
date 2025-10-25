import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import AuthScreen from '@/components/chat/AuthScreen';
import ChatList from '@/components/chat/ChatList';
import ChatWindow from '@/components/chat/ChatWindow';
import ChatDialogs from '@/components/chat/ChatDialogs';
import Icon from '@/components/ui/icon';

const CHATS_URL = 'https://functions.poehali.dev/4d069476-3336-4644-9ef7-bb70d595e5ae';
const PROFILE_URL = 'https://functions.poehali.dev/da9b0d09-13d2-409c-a27e-f8a49aef114e';

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
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showGroupSettingsDialog, setShowGroupSettingsDialog] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

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
    }
  }, [user]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
      setIsMobileChatOpen(true);
    }
  }, [selectedChat]);

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

  const createChat = async (username: string) => {
    try {
      const response = await fetch(CHATS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id.toString() || ''
        },
        body: JSON.stringify({
          action: 'create_chat',
          username
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: 'Чат создан!' });
        setShowNewChatDialog(false);
        loadChats();
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка создания чата', variant: 'destructive' });
    }
  };

  const createGroup = async (name: string, membersStr: string) => {
    try {
      const membersList = membersStr.split(',').map(m => m.trim()).filter(m => m);

      const response = await fetch(CHATS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id.toString() || ''
        },
        body: JSON.stringify({
          action: 'create_group',
          name,
          members: membersList
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: 'Группа создана!' });
        setShowNewGroupDialog(false);
        loadChats();
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка создания группы', variant: 'destructive' });
    }
  };

  const updateProfile = async (nickname: string, hideOnlineStatus: boolean) => {
    try {
      const response = await fetch(PROFILE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id.toString() || ''
        },
        body: JSON.stringify({
          action: 'update_profile',
          nickname,
          hide_online_status: hideOnlineStatus
        })
      });

      const data = await response.json();

      if (response.ok) {
        const updatedUser = { ...user!, nickname, hide_online_status: hideOnlineStatus };
        setUser(updatedUser);
        localStorage.setItem('pchat_user', JSON.stringify(updatedUser));
        toast({ title: 'Профиль обновлен!' });
        setShowSettingsDialog(false);
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка обновления профиля', variant: 'destructive' });
    }
  };

  const deleteAccount = async () => {
    if (!confirm('Вы уверены? Это действие необратимо.')) return;

    try {
      const response = await fetch(PROFILE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id.toString() || ''
        },
        body: JSON.stringify({
          action: 'delete_account'
        })
      });

      if (response.ok) {
        toast({ title: 'Аккаунт удален' });
        logout();
      } else {
        const data = await response.json();
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка удаления аккаунта', variant: 'destructive' });
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
      setShowGroupSettingsDialog(false);
      loadChats();
    } catch (error) {
      toast({ title: 'Ошибка', variant: 'destructive' });
    }
  };

  const logout = () => {
    localStorage.removeItem('pchat_user');
    setUser(null);
    setChats([]);
    setSelectedChat(null);
  };

  const closeDialog = (dialog: string) => {
    switch (dialog) {
      case 'newChat':
        setShowNewChatDialog(false);
        break;
      case 'newGroup':
        setShowNewGroupDialog(false);
        break;
      case 'settings':
        setShowSettingsDialog(false);
        break;
      case 'members':
        setShowMembersDialog(false);
        break;
      case 'groupSettings':
        setShowGroupSettingsDialog(false);
        break;
    }
  };

  if (!user) {
    return <AuthScreen onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex">
      <div className={`${isMobileChatOpen && selectedChat ? 'hidden md:block' : 'block'} w-full md:w-auto`}>
        <ChatList
          user={user}
          chats={chats}
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
          onNewChat={() => setShowNewChatDialog(true)}
          onNewGroup={() => setShowNewGroupDialog(true)}
          onSettings={() => setShowSettingsDialog(true)}
        />
      </div>

      <div className={`${isMobileChatOpen && selectedChat ? 'block' : 'hidden md:block'} flex-1 flex flex-col`}>
        {selectedChat ? (
          <div className="flex flex-col h-screen">
            <div className="md:hidden p-2 border-b border-purple-500/20 glass">
              <button
                onClick={() => setIsMobileChatOpen(false)}
                className="flex items-center gap-2 text-white hover:text-purple-300"
              >
                <Icon name="ArrowLeft" size={20} />
                <span>Назад</span>
              </button>
            </div>
            <ChatWindow
              user={user}
              chat={selectedChat}
              messages={messages}
              onMessagesUpdate={() => loadMessages(selectedChat.id)}
              onShowMembers={() => loadGroupMembers(selectedChat.id)}
              onShowGroupSettings={() => setShowGroupSettingsDialog(true)}
            />
          </div>
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

      <ChatDialogs
        user={user}
        selectedChat={selectedChat}
        showNewChatDialog={showNewChatDialog}
        showNewGroupDialog={showNewGroupDialog}
        showSettingsDialog={showSettingsDialog}
        showMembersDialog={showMembersDialog}
        showGroupSettingsDialog={showGroupSettingsDialog}
        members={members}
        onClose={closeDialog}
        onCreateChat={createChat}
        onCreateGroup={createGroup}
        onUpdateProfile={updateProfile}
        onLogout={logout}
        onDeleteAccount={deleteAccount}
        onLeaveGroup={leaveGroup}
        onUserUpdate={setUser}
      />
    </div>
  );
}