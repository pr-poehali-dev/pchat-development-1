import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

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

interface Member {
  id: number;
  username: string;
  nickname: string;
  avatar_url?: string;
  creator_id?: number;
}

interface ChatDialogsProps {
  user: User;
  selectedChat: Chat | null;
  showNewChatDialog: boolean;
  showNewGroupDialog: boolean;
  showSettingsDialog: boolean;
  showMembersDialog: boolean;
  showGroupSettingsDialog: boolean;
  members: Member[];
  onClose: (dialog: string) => void;
  onCreateChat: (username: string) => void;
  onCreateGroup: (name: string, members: string) => void;
  onUpdateProfile: (nickname: string, hideOnlineStatus: boolean) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onLeaveGroup: () => void;
  onUserUpdate: (user: User) => void;
}

export default function ChatDialogs({
  user,
  selectedChat,
  showNewChatDialog,
  showNewGroupDialog,
  showSettingsDialog,
  showMembersDialog,
  showGroupSettingsDialog,
  members,
  onClose,
  onCreateChat,
  onCreateGroup,
  onUpdateProfile,
  onLogout,
  onDeleteAccount,
  onLeaveGroup,
  onUserUpdate
}: ChatDialogsProps) {
  const [newChatUsername, setNewChatUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  const [profileNickname, setProfileNickname] = useState(user.nickname);
  const [hideOnlineStatus, setHideOnlineStatus] = useState(user.hide_online_status || false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingGroupAvatar, setUploadingGroupAvatar] = useState(false);
  const { toast } = useToast();

  const handleCreateChat = () => {
    onCreateChat(newChatUsername);
    setNewChatUsername('');
  };

  const handleCreateGroup = () => {
    onCreateGroup(groupName, groupMembers);
    setGroupName('');
    setGroupMembers('');
  };

  const handleUpdateProfile = () => {
    onUpdateProfile(profileNickname, hideOnlineStatus);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
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
        await fetch(PROFILE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.id.toString()
          },
          body: JSON.stringify({
            action: 'update_avatar',
            avatar_url: data.url
          })
        });

        const updatedUser = { ...user, avatar_url: data.url };
        onUserUpdate(updatedUser);
        localStorage.setItem('pchat_user', JSON.stringify(updatedUser));
        toast({ title: 'Аватар обновлен!' });
      } else {
        toast({ title: 'Ошибка загрузки', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка загрузки аватара', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleGroupAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    setUploadingGroupAvatar(true);
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
            action: 'update_group_avatar',
            chat_id: selectedChat.id,
            avatar_url: data.url
          })
        });

        toast({ title: 'Аватар группы обновлен!' });
        onClose('groupSettings');
      } else {
        toast({ title: 'Ошибка загрузки', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка загрузки аватара', variant: 'destructive' });
    } finally {
      setUploadingGroupAvatar(false);
    }
  };

  const removeMember = async (memberId: number) => {
    if (!selectedChat) return;

    try {
      await fetch(CHATS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id.toString()
        },
        body: JSON.stringify({
          action: 'remove_member',
          chat_id: selectedChat.id,
          member_id: memberId
        })
      });

      toast({ title: 'Участник удален' });
      onClose('members');
    } catch (error) {
      toast({ title: 'Ошибка', variant: 'destructive' });
    }
  };

  return (
    <>
      <Dialog open={showNewChatDialog} onOpenChange={() => onClose('newChat')}>
        <DialogContent className="glass-strong border-purple-500/30">
          <DialogHeader>
            <DialogTitle>Новый чат</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Имя пользователя"
              value={newChatUsername}
              onChange={(e) => setNewChatUsername(e.target.value)}
              className="glass border-purple-500/30"
            />
            <Button onClick={handleCreateChat} className="w-full bg-primary hover:bg-primary/90">
              Создать чат
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewGroupDialog} onOpenChange={() => onClose('newGroup')}>
        <DialogContent className="glass-strong border-purple-500/30">
          <DialogHeader>
            <DialogTitle>Новая группа</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Название группы"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="glass border-purple-500/30"
            />
            <Textarea
              placeholder="Участники (через запятую)"
              value={groupMembers}
              onChange={(e) => setGroupMembers(e.target.value)}
              className="glass border-purple-500/30"
            />
            <Button onClick={handleCreateGroup} className="w-full bg-primary hover:bg-primary/90">
              Создать группу
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettingsDialog} onOpenChange={() => onClose('settings')}>
        <DialogContent className="glass-strong border-purple-500/30">
          <DialogHeader>
            <DialogTitle>Настройки профиля</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="w-24 h-24">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-2xl">
                    {user.nickname[0].toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
                <Button variant="outline" size="sm" className="cursor-pointer" asChild disabled={uploadingAvatar}>
                  <span>
                    {uploadingAvatar ? 'Загрузка...' : 'Изменить аватар'}
                  </span>
                </Button>
              </label>
            </div>

            <div>
              <Label>Отображаемое имя</Label>
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

            <Button onClick={handleUpdateProfile} className="w-full bg-primary hover:bg-primary/90">
              Сохранить
            </Button>

            <Button onClick={onLogout} variant="outline" className="w-full">
              Выйти из аккаунта
            </Button>

            <Button onClick={onDeleteAccount} variant="destructive" className="w-full">
              Удалить аккаунт
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMembersDialog} onOpenChange={() => onClose('members')}>
        <DialogContent className="glass-strong border-purple-500/30">
          <DialogHeader>
            <DialogTitle>Участники группы</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 glass rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-400">
                        {member.nickname[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{member.nickname}</p>
                      <p className="text-xs text-muted-foreground">@{member.username}</p>
                    </div>
                  </div>
                  {selectedChat?.creator_id === user.id && member.id !== user.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMember(member.id)}
                    >
                      <Icon name="X" size={16} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showGroupSettingsDialog} onOpenChange={() => onClose('groupSettings')}>
        <DialogContent className="glass-strong border-purple-500/30">
          <DialogHeader>
            <DialogTitle>Настройки группы</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedChat?.creator_id === user.id && (
              <div className="flex flex-col items-center gap-3">
                <Avatar className="w-24 h-24">
                  {selectedChat.avatar_url ? (
                    <img src={selectedChat.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-400 text-2xl">
                      <Icon name="Users" size={32} />
                    </AvatarFallback>
                  )}
                </Avatar>
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGroupAvatarUpload}
                    className="hidden"
                    disabled={uploadingGroupAvatar}
                  />
                  <Button variant="outline" size="sm" className="cursor-pointer" asChild disabled={uploadingGroupAvatar}>
                    <span>
                      {uploadingGroupAvatar ? 'Загрузка...' : 'Изменить аватар группы'}
                    </span>
                  </Button>
                </label>
              </div>
            )}
            
            <Button onClick={onLeaveGroup} variant="destructive" className="w-full">
              Покинуть группу
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}