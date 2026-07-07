'use client';

import type { ReactNode } from 'react';
import { useState, useMemo } from 'react';
import { Card, CardBody, Button, Chip, Select, SelectItem, Pagination, Checkbox } from '@heroui/react';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import { useNotifications, useMarkRead } from '@/lib/queries';

export default function NotificationsPage(): ReactNode {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data, isLoading } = useNotifications({ type: typeFilter, status: statusFilter, page, limit: 20 });
  const markRead = useMarkRead();

  const notifications = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20) || 1;

  // ponytail: client-side filter since backend doesn't support type/read query params yet
  const filtered = useMemo(() => {
    let items = notifications;
    if (typeFilter !== 'all') items = items.filter((n) => n.type === typeFilter);
    if (statusFilter === 'unread') items = items.filter((n) => !n.read);
    if (statusFilter === 'read') items = items.filter((n) => n.read);
    return items;
  }, [notifications, typeFilter, statusFilter]);

  const handleBulkMarkRead = async () => {
    await markRead.mutateAsync({ ids: Array.from(selected) });
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        {selected.size > 0 && (
          <Button size="sm" variant="flat" onPress={handleBulkMarkRead} isLoading={markRead.isPending}>
            <CheckCheck size={16} /> Mark {selected.size} Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          label="Type"
          size="sm"
          className="w-40"
          selectedKeys={[typeFilter]}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <SelectItem key="all">All Types</SelectItem>
          <SelectItem key="status_update">Status Update</SelectItem>
          <SelectItem key="delivery">Delivery</SelectItem>
          <SelectItem key="exception">Exception</SelectItem>
          <SelectItem key="general">General</SelectItem>
        </Select>
        <Select
          label="Status"
          size="sm"
          className="w-40"
          selectedKeys={[statusFilter]}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <SelectItem key="all">All Status</SelectItem>
          <SelectItem key="unread">Unread</SelectItem>
          <SelectItem key="read">Read</SelectItem>
        </Select>
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {isLoading ? (
          <Card><CardBody><div className="flex items-center justify-center py-8 text-muted text-sm">Loading...</div></CardBody></Card>
        ) : filtered.length === 0 ? (
          <Card><CardBody>
            <div className="flex flex-col items-center py-8 text-muted">
              <Bell size={32} />
              <p className="mt-2">No notifications</p>
            </div>
          </CardBody></Card>
        ) : (
          filtered.map((n: { id: string; type: string; title: string; message: string; read: boolean; createdAt: string }) => (
            <Card key={n.id} className={n.read ? '' : 'border-l-3 border-l-primary'}>
              <CardBody className="flex items-start gap-3">
                <Checkbox
                  isSelected={selected.has(n.id)}
                  onValueChange={(v) => {
                    const next = new Set(selected);
                    v ? next.add(n.id) : next.delete(n.id);
                    setSelected(next);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted mt-1">{n.message}</p>
                  <p className="text-xs text-muted mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.read && <Chip size="sm" color="primary" variant="flat">New</Chip>}
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination total={totalPages} page={page} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
