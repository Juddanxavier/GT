'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button, Autocomplete, AutocompleteItem } from '@heroui/react';
import { useAssignShipment, useCustomerSearch } from '@/lib/queries';
import { UserPlus, UserX } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface AssignShipmentProps {
  shipmentId: string;
  currentCustomerId: string | null;
}

export function AssignShipment({ shipmentId, currentCustomerId }: AssignShipmentProps): ReactNode {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const assign = useAssignShipment();
  const { data: customers = [] } = useCustomerSearch(search);

  const handleAssign = async () => {
    if (!selected) return;
    await assign.mutateAsync({ shipmentId, customerId: selected });
    setSearch('');
    setSelected(null);
  };

  const handleUnassign = async () => {
    if (!confirm('Remove customer from this shipment?')) return;
    await assign.mutateAsync({ shipmentId, customerId: null });
  };

  const handleReassign = async () => {
    if (!selected) return;
    await assign.mutateAsync({ shipmentId, customerId: selected });
    setSearch('');
    setSelected(null);
  };

  return (
    <div className="space-y-3">
      {currentCustomerId ? (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="flat" onPress={handleUnassign} isLoading={assign.isPending}>
            <UserX size={14} /> Unassign
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted">No customer assigned</p>
      )}

      <div className="flex items-start gap-2">
        <Autocomplete
          label="Search customer"
          placeholder="Type name, email, or phone..."
          inputValue={search}
          onInputChange={setSearch}
          selectedKey={selected}
          onSelectionChange={(k) => setSelected(k as string)}
          className="flex-1"
          size="sm"
        >
          {(customers ?? []).map((c: { id: string; name: string; email?: string; phone?: string }) => (
            <AutocompleteItem key={c.id} textValue={c.name}>
              <div>
                <p className="text-sm">{c.name}</p>
                <p className="text-xs text-muted">{c.email ?? c.phone}</p>
              </div>
            </AutocompleteItem>
          ))}
        </Autocomplete>

        <Button
          color="primary"
          size="sm"
          onPress={currentCustomerId ? handleReassign : handleAssign}
          isLoading={assign.isPending}
          isDisabled={!selected}
        >
          <UserPlus size={14} /> {currentCustomerId ? 'Reassign' : 'Assign'}
        </Button>
      </div>
    </div>
  );
}
