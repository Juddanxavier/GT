'use client';

import { Card } from '@heroui/react';
import type { PerBranch, PerTenant } from './types';
import { formatCurrency } from './utils';

export function PerEntityTable({
  mode,
  perBranch,
  perTenant,
}: {
  mode: 'branch' | 'tenant';
  perBranch?: PerBranch[];
  perTenant?: PerTenant[];
}) {
  const rows = mode === 'branch' ? (perBranch ?? []) : (perTenant ?? []);

  return (
    <Card className="content-panel border-glass">
      <Card.Header className="pb-0">
        <Card.Title className="text-base font-semibold">
          {mode === 'branch' ? 'Per Branch' : 'Per Tenant'}
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-glass">
                <th className="pb-3 font-medium">{mode === 'branch' ? 'Branch' : 'Tenant'}</th>
                <th className="pb-3 font-medium text-right">Shipments</th>
                <th className="pb-3 font-medium text-right">In Transit</th>
                <th className="pb-3 font-medium text-right">Delivered Today</th>
                <th className="pb-3 font-medium text-right">Bill Amount</th>
                {mode === 'tenant' ? (
                  <th className="pb-3 font-medium text-right">Branches</th>
                ) : (
                  <th className="pb-3 font-medium text-right">Customers</th>
                )}
              </tr>
            </thead>
            <tbody>
              {mode === 'branch'
                ? (rows as PerBranch[]).map((pb) => (
                    <tr key={pb.branchId} className="border-b border-glass hover:bg-muted/20 transition-colors">
                      <td className="py-3 font-medium">{pb.branchName}</td>
                      <td className="py-3 text-right tabular-nums">{pb.shipments.total}</td>
                      <td className="py-3 text-right text-warning font-medium tabular-nums">{pb.shipments.inTransit}</td>
                      <td className="py-3 text-right text-success font-medium tabular-nums">{pb.shipments.deliveredToday}</td>
                      <td className="py-3 text-right tabular-nums">{formatCurrency(pb.invoices.revenueTotal)}</td>
                      <td className="py-3 text-right tabular-nums">{pb.customers.active}/{pb.customers.total}</td>
                    </tr>
                  ))
                : (rows as PerTenant[]).map((pt) => (
                    <tr key={pt.tenantId} className="border-b border-glass hover:bg-muted/20 transition-colors">
                      <td className="py-3 font-medium">{pt.tenantName}</td>
                      <td className="py-3 text-right tabular-nums">{pt.shipments.total}</td>
                      <td className="py-3 text-right text-warning font-medium tabular-nums">{pt.shipments.inTransit}</td>
                      <td className="py-3 text-right text-success font-medium tabular-nums">{pt.shipments.deliveredToday}</td>
                      <td className="py-3 text-right tabular-nums">{formatCurrency(pt.invoices.revenueTotal)}</td>
                      <td className="py-3 text-right tabular-nums">{pt.branches.total}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="text-sm text-muted text-center py-8">No data available</p>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
