'use server';

/**
 * src/lib/actions/notifications.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server Actions for the Notification Bell.
 * Uses the service-role admin client to bypass RLS on the notification table
 * (the app uses custom auth, not Supabase Auth, so RLS uid() policies would
 * block regular-key reads/writes).
 */

import { createAdminClient } from '@/lib/supabaseServer';
import { Notification }      from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

/**
 * Fetch the N most-recent notifications for a user (unread first).
 */
export async function getMyNotifications(
  userId:   string,
  limit:    number = 20,
): Promise<{ notifications: Notification[]; unreadCount: number }> {
  if (!userId) return { notifications: [], unreadCount: 0 };

  const admin: AnyClient = createAdminClient();

  const { data, error } = await admin
    .from('notification')
    .select('notification_id, user_id, title, message, type, is_read, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getMyNotifications]', error.message);
    return { notifications: [], unreadCount: 0 };
  }

  const notifications = (data ?? []) as Notification[];
  const unreadCount   = notifications.filter(n => !n.is_read).length;

  return { notifications, unreadCount };
}

/**
 * Mark all notifications for a user as read.
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!userId) return;

  const admin: AnyClient = createAdminClient();

  const { error } = await admin
    .from('notification')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .is('deleted_at', null);

  if (error) {
    console.error('[markAllNotificationsRead]', error.message);
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  if (!notificationId) return;

  const admin: AnyClient = createAdminClient();

  const { error } = await admin
    .from('notification')
    .update({ is_read: true })
    .eq('notification_id', notificationId);

  if (error) {
    console.error('[markNotificationRead]', error.message);
  }
}
