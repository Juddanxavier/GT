'use client';

import type { ReactNode } from 'react';
import { useState, useRef, useEffect } from 'react';
import { Button, Card } from '@heroui/react';
import { useAssignShipment, useCustomerSearch } from '@/lib/queries';
import { useToast } from '@/components/toast';
import { UserPlus, UserX, Search, User, Mail, Phone, CheckCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface AssignedToProps {
  shipmentId: string;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null | undefined;
  customerPhone: string | null | undefined;
}

export function AssignedTo({ shipmentId, customerId, customerName, customerEmail, customerPhone }: AssignedToProps): ReactNode {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const assign = useAssignShipment();
  const { data: customers = [] } = useCustomerSearch(search);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAssign = async () => {
    if (!selected) return;
    try {
      await assign.mutateAsync({ shipmentId, customerId: selected });
      const name = customers.find((c: { id: string; name: string }) => c.id === selected)?.name ?? 'Customer';
      toast('success', `Assigned to ${name}`, 'A notification has been sent.');
    } catch {
      toast('error', 'Failed to assign customer');
    }
    setSearch('');
    setSelected(null);
    setOpen(false);
    setChanging(false);
    queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] });
  };

  const handleUnassign = async () => {
    try {
      await assign.mutateAsync({ shipmentId, customerId: null });
      toast('info', 'Shipment unassigned');
    } catch {
      toast('error', 'Failed to unassign');
    }
    queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] });
  };

  return (
    <div className="space-y-4" ref={ref}>
      {customerId ? (
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <User size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{customerName ?? 'Customer'}</p>
              {customerEmail && (
                <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                  <Mail size={11} /> {customerEmail}
                </p>
              )}
              {customerPhone && (
                <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                  <Phone size={11} /> {customerPhone}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="ghost" onPress={() => { setChanging(!changing); setSearch(''); }} isIconOnly aria-label="Change assignment">
              <Search size={14} />
            </Button>
            <Button size="sm" variant="ghost" onPress={handleUnassign} isPending={assign.isPending} isIconOnly aria-label="Unassign">
              <UserX size={14} />
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted flex items-center gap-2 mb-3">
            <User size={14} className="text-muted/60" />
            Unassigned
          </p>
          <p className="text-xs text-muted/60 mb-3">Claimable via customer portal.</p>
          <Button size="sm" variant="secondary" onPress={() => setChanging(true)}>
            <UserPlus size={14} /> Assign Customer
          </Button>
        </div>
      )}

      {changing && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
              <Search size={14} className="text-muted shrink-0" />
              <input
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted"
                placeholder="Search name, email, or phone..."
                value={search}
                role="combobox"
                aria-expanded={open && search.length >= 2}
                aria-controls={open && search.length >= 2 ? 'assigned-to-results' : undefined}
                aria-autocomplete="list"
                onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
              />
            </div>
            {open && search.length >= 2 && (
              <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-auto">
                <div
                  className="py-1"
                  id="assigned-to-results"
                  role="listbox"
                  aria-label="Matching customers"
                >
                  {customers.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-muted text-center">No customers match "{search}"</p>
                  ) : (
                    customers.map((c: { id: string; name: string; email?: string; phone?: string }) => (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        aria-selected={selected === c.id}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/10 transition-colors ${selected === c.id ? 'bg-primary/10' : ''}`}
                        onClick={() => {
                          setSelected(c.id);
                          setOpen(false);
                        }}
                      >
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted">{c.email ?? c.phone}</p>
                      </button>
                    ))
                  )}
                </div>
              </Card>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selected && (
              <Button variant="primary" size="sm" onPress={handleAssign} isPending={assign.isPending}>
                <CheckCircle size={14} /> {customerId ? 'Reassign' : 'Assign'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onPress={() => { setChanging(false); setSelected(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
