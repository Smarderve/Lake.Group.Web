import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { adminApi, type AdminUser } from './api';
import { apiErrorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { useToast } from '../../components/ui/toast';

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [password, setPassword] = useState('');
  const [revokeUser, setRevokeUser] = useState<AdminUser | null>(null);

  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.users });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  const mutation = useMutation({
    mutationFn: async (operation: 'password' | 'revoke') => {
      if (operation === 'password' && passwordUser) return adminApi.resetPassword(passwordUser.id, password);
      if (operation === 'revoke' && revokeUser) return adminApi.revokeSessions(revokeUser.id);
      throw new Error('No user operation selected');
    },
    onSuccess: (_data, operation) => {
      toast({
        variant: 'success',
        title:
          operation === 'password'
              ? 'Password reset'
              : 'Sessions revoked',
      });
      setPasswordUser(null);
      setPassword('');
      setRevokeUser(null);
      void refresh();
    },
    onError: (error) => toast({ variant: 'error', title: 'User operation failed', description: apiErrorMessage(error) }),
  });

  return (
    <>
      <PageHeader
        title="CMS Users"
        description="Manage IT Administrator access, account security, and active sessions. Legacy editorial roles are not used by CMS V2."
      />

      {users.isPending ? (
        <Card className="space-y-3 p-5" aria-label="Loading users">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </Card>
      ) : users.isError ? (
        <ErrorState message={apiErrorMessage(users.error)} onRetry={() => void users.refetch()} />
      ) : (
        <>
        <ul aria-label="CMS users mobile" className="space-y-3 lg:hidden">
          {users.data.users.map((row) => {
            const isSelf = row.id === currentUser?.id;
            return (
              <li key={row.id}>
                <Card className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-all text-sm font-semibold text-ink">{row.email}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {isSelf ? 'Current account · ' : ''}Joined {formatDate(row.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={row.active ? 'green' : 'neutral'}>{row.active ? 'Active' : 'Inactive'}</Badge>
                      <Badge tone={row.mfaEnabled ? 'blue' : 'amber'}>{row.mfaEnabled ? 'MFA enabled' : 'MFA off'}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-ink-muted">CMS access: <span className="font-medium text-ink">{row.cmsAccessLevel === 'IT_ADMIN' ? 'IT Administrator' : 'Disabled'}</span></p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Reset password for ${row.email}`}
                      onClick={() => setPasswordUser(row)}
                    >
                      Reset password
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Revoke sessions for ${row.email}`}
                      disabled={isSelf}
                      onClick={() => setRevokeUser(row)}
                    >
                      Revoke sessions
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
        <Card className="hidden overflow-hidden lg:block">
          <Table aria-label="CMS users">
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>CMS access</TableHead>
                <TableHead>Security</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.users.map((row) => {
                const isSelf = row.id === currentUser?.id;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="break-all font-medium">{row.email}</p>
                      {isSelf && <p className="text-xs text-ink-muted">Current account</p>}
                    </TableCell>
                    <TableCell>
                      <Badge tone={row.cmsAccessLevel === 'IT_ADMIN' ? 'green' : 'neutral'}>{row.cmsAccessLevel === 'IT_ADMIN' ? 'IT Administrator' : 'Disabled'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={row.active ? 'green' : 'neutral'}>{row.active ? 'Active' : 'Inactive'}</Badge>
                        <Badge tone={row.mfaEnabled ? 'blue' : 'amber'}>{row.mfaEnabled ? 'MFA enabled' : 'MFA off'}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink-muted">{formatDate(row.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPasswordUser(row)}>
                          Reset password
                        </Button>
                        <Button variant="ghost" size="sm" disabled={isSelf} onClick={() => setRevokeUser(row)}>
                          Revoke sessions
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
        </>
      )}

      <Dialog
        open={Boolean(passwordUser)}
        onClose={() => {
          setPasswordUser(null);
          setPassword('');
        }}
        title="Reset password"
        description={passwordUser ? `Set a temporary password for ${passwordUser.email}.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPasswordUser(null)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate('password')}
              loading={mutation.isPending}
              disabled={password.length < 8}
            >
              Reset password
            </Button>
          </>
        }
      >
        <Field
          id="temporary-password"
          label="Temporary password"
          required
          hint="Use at least 8 characters and share it through an approved secure channel."
        >
          <Input
            id="temporary-password"
            name="temporaryPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
      </Dialog>

      <ConfirmDialog
        open={Boolean(revokeUser)}
        title="Revoke active sessions"
        description={revokeUser ? `${revokeUser.email} will be signed out on every device.` : ''}
        confirmLabel="Revoke sessions"
        tone="danger"
        loading={mutation.isPending}
        onCancel={() => setRevokeUser(null)}
        onConfirm={() => mutation.mutate('revoke')}
      />
    </>
  );
}
