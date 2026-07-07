'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { Card, Switch, Button, Spinner } from '@heroui/react';
import { Mail, MessageSquare } from 'lucide-react';

interface Prefs {
  deliveryEmail?: boolean;
  deliveryWhatsapp?: boolean;
  exceptionEmail?: boolean;
  exceptionWhatsapp?: boolean;
  generalEmail?: boolean;
  generalWhatsapp?: boolean;
}

export default function CustomerNotificationSettingsPage(): ReactNode {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/notification-preferences')
      .then((r) => r.json())
      .then((d) => { setPrefs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggle = (key: keyof Prefs) => {
    setPrefs((p) => (p ? { ...p, [key]: !p[key] } : p));
  };

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      await fetch('/api/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (loading) return <Spinner />;

  const categories = [
    { key: 'delivery', label: 'Delivery Updates', desc: 'Package picked up, out for delivery, delivered' },
    { key: 'exception', label: 'Exception Alerts', desc: 'Delivery failure, delays, exceptions' },
    { key: 'general', label: 'General Updates', desc: 'Account notifications, promotional' },
  ] as const;

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-semibold">Notification Preferences</h1>
      <p className="text-sm text-muted">Choose how you want to be notified about shipment updates.</p>
      {categories.map((cat) => (
        <Card key={cat.key}>
          <Card.Header><p className="text-sm font-medium">{cat.label}</p></Card.Header>
          <Card.Content className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Mail size={16} /><span className="text-sm">Email</span></div>
              <Switch isSelected={!!prefs?.[`${cat.key}Email` as keyof Prefs]} onChange={() => toggle(`${cat.key}Email` as keyof Prefs)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><MessageSquare size={16} /><span className="text-sm">WhatsApp</span></div>
              <Switch isSelected={!!prefs?.[`${cat.key}Whatsapp` as keyof Prefs]} onChange={() => toggle(`${cat.key}Whatsapp` as keyof Prefs)} />
            </div>
            <p className="text-xs text-muted">{cat.desc}</p>
          </Card.Content>
        </Card>
      ))}
      <Button variant="primary" onPress={save} isPending={saving}>Save Preferences</Button>
    </div>
  );
}
