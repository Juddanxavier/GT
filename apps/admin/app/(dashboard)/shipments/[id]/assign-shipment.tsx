'use client';

import type { ReactNode } from 'react';
import { useState, useRef, useEffect } from 'react';
import { Button, Card } from '@heroui/react';
import { useAssignShipment, useCustomerSearch } from '@/lib/queries';
import { UserPlus, UserX, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface AssignShipmentProps {
  shipmentId: string;
  currentCustomerId: string | null;
}

export function AssignShipment({ shipmentId, currentCustomerId }: AssignShipmentProps): ReactNode {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const assign = useAssignShipment();
  const { data: customers = [] } = useCustomerSearch(search);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAssign = async () => {
    if (!selected) return;
    await assign.mutateAsync({ shipmentId, customerId: selected });
    setSearch('');
    setSelected(null);
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] });
  };

  const handleUnassign = async () => {
    if (!confirm('Remove customer from this shipment?')) return;
    await assign.mutateAsync({ shipmentId, customerId: null });
    queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] });
  };

  return (
    <div className="space-y-3" ref={ref}>
      {currentCustomerId ? (
        <Button size="sm" variant="ghost" onPress={handleUnassign} isPending={assign.isPending}>
          <UserX size={14} /> Unassign
        </Button>
      ) : (
        <p className="text-xs text-muted">No customer assigned</p>
      )}

      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
          <Search size={14} className="text-muted shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted"
            placeholder="Search name, email, or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
        </div>
        {open && search && customers.length > 0 && (
          <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-auto">
            <div className="py-1">
              {customers.map((c: { id: string; name: string; email?: string; phone?: string }) => (
                <button
                  key={c.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/10 transition-colors ${selected === c.id ? 'bg-primary/10' : ''}`}
                  onClick={() => {
                    setSelected(c.id);
                    setOpen(false);
                  }}
                >
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted">{c.email ?? c.phone}</p>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Button
        variant="primary"
        size="sm"
        onPress={currentCustomerId && selected ? handleAssign : handleAssign}
        isPending={assign.isPending}
        isDisabled={!selected}
      >
        <UserPlus size={14} /> {currentCustomerId ? 'Reassign' : 'Assign'}
      </Button>
    </div>
  );
}
