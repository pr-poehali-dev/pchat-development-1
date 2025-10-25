import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const AUTH_URL = 'https://functions.poehali.dev/520ad929-c909-4e2b-8a6a-23d0f8648a5d';

interface User {
  id: number;
  username: string;
  nickname: string;
  avatar_url?: string;
  hide_online_status?: boolean;
}

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const { toast } = useToast();

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
        onLogin(data);
        localStorage.setItem('pchat_user', JSON.stringify(data));
        toast({ title: isLogin ? 'Добро пожаловать!' : 'Аккаунт создан!' });
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка подключения', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 glass-strong border-purple-500/30">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-4">
            <Icon name="MessageCircle" size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">PChat</h1>
          <p className="text-purple-200">Безопасный мессенджер</p>
        </div>
        
        <div className="space-y-4">
          <Input
            placeholder="Имя пользователя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="glass border-purple-500/30"
          />
          
          <Input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
            className="glass border-purple-500/30"
          />
          
          {!isLogin && (
            <Input
              placeholder="Отображаемое имя"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="glass border-purple-500/30"
            />
          )}
          
          <Button onClick={handleAuth} className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
            {isLogin ? 'Войти' : 'Зарегистрироваться'}
          </Button>
          
          <Button
            onClick={() => setIsLogin(!isLogin)}
            variant="ghost"
            className="w-full text-purple-200 hover:text-white hover:bg-purple-500/20"
          >
            {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
