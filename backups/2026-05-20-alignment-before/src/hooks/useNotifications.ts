import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // Unique per-instance ID so two components mounting this hook don't collide
  // on the same channel name (which throws "cannot add callbacks after subscribe()").
  const instanceId = useRef(Math.random().toString(36).slice(2, 10));

  const refetch = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, data, read, created_at')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data as AppNotification[]);
      setUnreadCount(data.filter((n: AppNotification) => !n.read).length);
    }
    setLoading(false);
  }, [profile?.id]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!profile?.id) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', profile.id)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [profile?.id]);

  useEffect(() => {
    refetch();
    if (!profile?.id) return;

    const channel = supabase
      .channel(`notif:${profile.id}:${instanceId.current}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${profile.id}`,
        },
        (payload) => {
          const n = payload.new as AppNotification;
          setNotifications(prev => [n, ...prev.slice(0, 49)]);
          setUnreadCount(c => c + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, refetch]);

  return { notifications, unreadCount, loading, markRead, markAllRead, refetch };
}
