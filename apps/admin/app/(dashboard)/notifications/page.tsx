'use client';

import type { ReactNode } from 'react';
import { useState, useMemo } from 'react';
import { Card, Button, Chip, Select, ListBox, Pagination, Checkbox } from '@heroui/react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications, useMarkRead } from '@/lib/queries';
import { usePageTitle } from '@/lib/use-page-title';
import { PageHeader } from '@/components/page-header';

export default function NotificationsPage(): ReactNode {
  usePageTitle('Notifications');
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
      <PageHeader
        title="Notifications"
        subtitle="Alerts and updates across your shipments"
        icon={<Bell size={18} />}
        action={selected.size > 0 ? (
          <Button size="sm" variant="primary" onPress={handleBulkMarkRead} isPending={markRead.isPending}>
            <CheckCheck size={16} /> Mark {selected.size} Read
          </Button>
        ) : undefined}
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          selectedKey={typeFilter}
          onSelectionChange={(k) => { setTypeFilter(k as string); setPage(1); }}
          className="w-40"
        >
          <Select.Trigger className="h-10 text-sm">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all">All Types</ListBox.Item>
              <ListBox.Item id="status_update">Status Update</ListBox.Item>
              <ListBox.Item id="delivery">Delivery</ListBox.Item>
              <ListBox.Item id="exception">Exception</ListBox.Item>
              <ListBox.Item id="general">General</ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
        <Select
          selectedKey={statusFilter}
          onSelectionChange={(k) => { setStatusFilter(k as string); setPage(1); }}
          className="w-40"
        >
          <Select.Trigger className="h-10 text-sm">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all">All Status</ListBox.Item>
              <ListBox.Item id="unread">Unread</ListBox.Item>
              <ListBox.Item id="read">Read</ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {isLoading ? (
          <Card className="content-panel border-glass"><Card.Content><div className="flex items-center justify-center py-8 text-muted text-sm">Loading...</div></Card.Content></Card>
        ) : filtered.length === 0 ? (
          <Card className="content-panel border-glass"><Card.Content>
            <div className="flex flex-col items-center py-8 text-muted">
              <Bell size={32} />
              <p className="mt-2">No notifications</p>
            </div>
          </Card.Content></Card>
        ) : (
          filtered.map((n: { id: string; type: string; title: string; message: string; read: boolean; createdAt: string }) => (
            <Card key={n.id} className={`content-panel border-glass ${n.read ? '' : 'border-l-3 border-l-primary'}`}>
              <Card.Content className="flex items-start gap-3">
                <Checkbox
                  isSelected={selected.has(n.id)}
                  onChange={(v) => {
                    const next = new Set(selected);
                    if (v) { next.add(n.id); } else { next.delete(n.id); }
                    setSelected(next);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted mt-1">{n.message}</p>
                  <p className="text-xs text-muted mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.read && <Chip size="sm" variant="soft" color="accent">New</Chip>}
              </Card.Content>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination size="sm">
            <Pagination.Summary>Page {page} of {totalPages}</Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous isDisabled={page === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
                  <Pagination.PreviousIcon /> Prev
                </Pagination.Previous>
              </Pagination.Item>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Pagination.Item key={p}>
                  <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>{p}</Pagination.Link>
                </Pagination.Item>
              ))}
              <Pagination.Item>
                <Pagination.Next isDisabled={page === totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </div>
      )}
    </div>
  );
}
