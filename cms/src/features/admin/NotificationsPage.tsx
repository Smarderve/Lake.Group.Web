import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from './api';
import { apiErrorMessage } from '../../services/api';
import { relativeTime } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/toast';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const notifications = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: adminApi.notifications,
  });
  const mutation = useMutation<unknown, Error, string>({
    mutationFn: (id: string | 'all') =>
      id === 'all' ? adminApi.markAllNotificationsRead() : adminApi.markNotificationRead(id),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Notifications updated' });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
    onError: (error) =>
      toast({ variant: 'error', title: 'Unable to update notifications', description: apiErrorMessage(error) }),
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Workflow and publishing updates for your account."
        actions={
          <Button
            variant="outline"
            disabled={!notifications.data?.unreadCount}
            loading={mutation.isPending && mutation.variables === 'all'}
            onClick={() => mutation.mutate('all')}
          >
            Mark all as read
          </Button>
        }
      />
      {notifications.isPending ? (
        <div className="space-y-3" aria-label="Loading notifications">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : notifications.isError ? (
        <ErrorState message={apiErrorMessage(notifications.error)} onRetry={() => void notifications.refetch()} />
      ) : notifications.data.notifications.length === 0 ? (
        <EmptyState title="You're all caught up" description="Workflow updates will appear here." />
      ) : (
        <ul className="space-y-3">
          {notifications.data.notifications.map((notification) => (
            <li key={notification.id}>
              <Card className={`flex items-start justify-between gap-4 p-4 ${notification.read ? '' : 'border-brand-200 bg-brand-50/30'}`}>
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone={notification.read ? 'neutral' : 'green'}>{notification.read ? 'Read' : 'Unread'}</Badge>
                    <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                      {notification.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="break-words text-sm font-medium text-ink">{notification.message}</p>
                  <p className="mt-1 text-xs text-ink-muted">{relativeTime(notification.createdAt)}</p>
                </div>
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={mutation.isPending && mutation.variables === notification.id}
                    onClick={() => mutation.mutate(notification.id)}
                  >
                    Mark read
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
