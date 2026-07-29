'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { Switch, Button } from '@heroui/react';
import { Mail, MessageSquare, Bell } from 'lucide-react';

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

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-[#F94735] border-t-transparent rounded-full" /></div>;

  const categories = [
    { key: 'delivery', label: 'Delivery Updates', desc: 'Package picked up, out for delivery, delivered' },
    { key: 'exception', label: 'Exception Alerts', desc: 'Delivery failure, delays, exceptions' },
    { key: 'general', label: 'General Updates', desc: 'Account notifications, promotional' },
  ] as const;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#F94735]/10 text-[#F94735] flex items-center justify-center">
          <Bell size={24} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Notification Preferences</h1>
          <p className="text-foreground/50 mt-0.5">Choose how you want to be notified.</p>
        </div>
      </div>

      {categories.map((cat) => (
        <div key={cat.key} className="rounded-xl bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{cat.label}</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer py-1">
              <div className="flex items-center gap-2.5">
                <Mail size={16} className="text-foreground/40" />
                <span className="text-foreground">Email</span>
              </div>
              <Switch isSelected={!!prefs?.[`${cat.key}Email` as keyof Prefs]} onChange={() => toggle(`${cat.key}Email` as keyof Prefs)} />
            </label>
            <label className="flex items-center justify-between cursor-pointer py-1">
              <div className="flex items-center gap-2.5">
                <MessageSquare size={16} className="text-foreground/40" />
                <span className="text-foreground">WhatsApp</span>
              </div>
              <Switch isSelected={!!prefs?.[`${cat.key}Whatsapp` as keyof Prefs]} onChange={() => toggle(`${cat.key}Whatsapp` as keyof Prefs)} />
            </label>
          </div>
          <p className="text-xs text-foreground/40">{cat.desc}</p>
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <Button onPress={save} isPending={saving} className="bg-[#F94735] text-white">Save Preferences</Button>
      </div>
    </div>
  );
}
