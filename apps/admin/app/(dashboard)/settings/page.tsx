'use client';

import { Button, Card, Chip, ListBox, Select, Switch } from '@heroui/react';
import {
  Building2,
  Mail,
  MessageSquareText,
  Monitor,
  Moon,
  PackageCheck,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/components/toast';
import { TrackQuotaCard } from '@/components/track-quota-card';
import { authClient } from '@/lib/auth-client';
import {
  type NotificationPrefs,
  useBranches,
  useIntegrations,
  useNotificationPrefs,
  useTemplatePreviews,
  useTenants,
  useUpdateNotificationPrefs,
} from '@/lib/queries';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { usePageTitle } from '@/lib/use-page-title';
import { useTheme } from '@/lib/use-theme';
import { getUser } from '@/types/auth';

const PREF_GROUPS = [
  {
    key: 'delivery',
    title: 'Delivery Updates',
    desc: 'Picked up, out for delivery, delivered',
    keys: ['deliveryEmail', 'deliveryWhatsapp'] as const,
  },
  {
    key: 'exception',
    title: 'Exception Alerts',
    desc: 'Delay, failure, exception events',
    keys: ['exceptionEmail', 'exceptionWhatsapp'] as const,
  },
  {
    key: 'general',
    title: 'General Updates',
    desc: 'Registered and status-change messages',
    keys: ['generalEmail', 'generalWhatsapp'] as const,
  },
];

const PREF_LABEL: Record<string, string> = {
  deliveryEmail: 'Email',
  deliveryWhatsapp: 'WhatsApp',
  exceptionEmail: 'Email',
  exceptionWhatsapp: 'WhatsApp',
  generalEmail: 'Email',
  generalWhatsapp: 'WhatsApp',
};

function SectionCard({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="content-panel border-glass">
      <Card.Header className="pb-1">
        <Card.Title className="text-sm font-semibold flex items-center gap-2">
          <span className="text-muted">{icon}</span> {title}
        </Card.Title>
      </Card.Header>
      <Card.Content className="space-y-4">
        {children}
        {action}
      </Card.Content>
    </Card>
  );
}

export default function SettingsPage() {
  usePageTitle('Settings');
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = authClient.useSession();
  const user = getUser(session);
  const isStaff = user?.role === 'staff';
  const isSuperadmin = user?.role === 'superadmin';
  const { tenantFilter } = useTenantFilter();

  const { data: tenants = [] } = useTenants();
  const {
    data: branches = [],
    isLoading: branchesLoading,
    isError: branchesError,
    refetch,
  } = useBranches();
  const { data: integrations } = useIntegrations();
  const { data: previews } = useTemplatePreviews();
  const { data: prefs = {} } = useNotificationPrefs();
  const { mutateAsync: updatePrefs, isPending: savingPrefs } = useUpdateNotificationPrefs();
  const [reloading, setReloading] = useState(false);
  const { theme, setTheme } = useTheme();

  if (isStaff) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <SettingsIcon size={48} className="text-muted" />
        <p className="text-lg text-muted">Only admins can access settings.</p>
        <Button variant="ghost" onPress={() => router.push('/')}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const togglePref = async (key: keyof NotificationPrefs, value: boolean) => {
    try {
      await updatePrefs({ [key]: value });
      toast('success', 'Preference updated');
    } catch (err) {
      toast(
        'error',
        'Save failed',
        err instanceof Error ? err.message : 'Could not update preference.',
      );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Settings"
        subtitle="Appearance, integration status, and notification configuration."
        icon={<SettingsIcon size={20} />}
      />

      {/* Appearance */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted tracking-tight">Appearance</h2>
        <SectionCard title="Appearance" icon={<Moon size={16} />}>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted">
                Choose light, dark, or follow your system preference. Persisted on this browser.
              </p>
            </div>
            <Select
              selectedKey={theme}
              onSelectionChange={(k) => setTheme((k as 'light' | 'dark' | 'system') ?? 'system')}
              aria-label="Theme"
              className="w-36 shrink-0"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="light" textValue="Light">
                    <Sun size={16} className="text-muted" /> Light
                  </ListBox.Item>
                  <ListBox.Item id="dark" textValue="Dark">
                    <Moon size={16} className="text-muted" /> Dark
                  </ListBox.Item>
                  <ListBox.Item id="system" textValue="System">
                    <Monitor size={16} className="text-muted" /> System
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </SectionCard>
      </section>

      {/* 17TRACK quota + branches */}
      <div className="grid gap-6 lg:grid-cols-2">
        {isSuperadmin && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted tracking-tight">17TRACK Quota</h2>
            <TrackQuotaCard />
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted tracking-tight">Branches</h2>
          <Card>
            <Card.Header className="pb-1">
              <Card.Title className="text-sm font-semibold flex items-center gap-2">
                <Building2 size={16} className="text-muted" /> Branches
              </Card.Title>
            </Card.Header>
            <Card.Content>
              {branchesLoading && <div className="h-24 rounded-xl content-panel animate-pulse opacity-60" />}
              {branchesError && (
                <div className="py-8 text-center space-y-2">
                  <p className="text-sm text-muted">Failed to load branches.</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      setReloading(true);
                      refetch().finally(() => setReloading(false));
                    }}
                    isDisabled={reloading}
                  >
                    {reloading ? 'Retrying…' : 'Retry'}
                  </Button>
                </div>
              )}
              {!branchesLoading && !branchesError && branches.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">No branches yet.</p>
              )}
              {!branchesLoading && !branchesError && branches.length > 0 && (
                <ul className="divide-y divide-border">
                  {branches.map((b) => (
                    <li key={b.id} className="py-2.5 first:pt-0 last:pb-0">
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="text-xs text-muted truncate">
                        {[b.phone, b.email, b.address].filter(Boolean).join(' · ') ||
                          'No contact info'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Content>
          </Card>
        </section>
      </div>

      {/* My notification preferences */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted tracking-tight">My Notification Preferences</h2>
        <SectionCard title="Notification Preferences" icon={<MessageSquareText size={16} />}>
          {isSuperadmin && !tenantFilter && tenants.length > 0 ? (
            <p className="text-sm text-muted">
              Select an organization from the tenant filter in the top bar to manage your
              notification preferences.
            </p>
          ) : (
            <div className="space-y-4">
              {PREF_GROUPS.map((group) => (
                <div key={group.key} className="rounded-sm border border-border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium">{group.title}</p>
                    <p className="text-xs text-muted">{group.desc}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.keys.map((key) => (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          {key.endsWith('Whatsapp') ? (
                            <MessageSquareText size={16} className="text-muted" />
                          ) : (
                            <Mail size={16} className="text-muted" />
                          )}
                          <span>{PREF_LABEL[key] ?? key}</span>
                        </div>
                        <Switch
                          isSelected={Boolean(prefs[key])}
                          onChange={(v) => togglePref(key, Boolean(v))}
                          isDisabled={savingPrefs}
                          aria-label={`${group.title} ${PREF_LABEL[key] ?? key}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      {/* Notification templates */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted tracking-tight">Notification Templates</h2>
        <SectionCard
          title="Status Alert Templates"
          icon={<Mail size={16} />}
          action={
            <p className="text-xs text-muted">
              Rendered from the live email and WhatsApp templates used for status notifications.
            </p>
          }
        >
          {!previews ? (
            <div className="h-24 rounded-xl content-panel animate-pulse opacity-60" />
          ) : (
            <ul className="divide-y divide-border">
              {previews.map((t) => (
                <li key={t.event} className="py-3 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-start gap-3">
                    <PackageCheck size={16} className="text-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t.title}</p>
                      <div className="text-xs text-muted space-y-1 mt-1">
                        {t.whatsapp ? (
                          <p>
                            <span className="font-medium">WhatsApp:</span>{' '}
                            <span className="font-mono">Template {t.whatsapp.templateId}</span> ·{' '}
                            {Object.entries(t.whatsapp.variables)
                              .map(([k, v]) => `${k}=${v || '(empty)'}`)
                              .join(', ')}
                          </p>
                        ) : (
                          <p>WhatsApp template not configured for this event.</p>
                        )}
                      </div>
                      <details className="mt-2">
                        <summary className="text-xs font-medium text-accent cursor-pointer">
                          Preview email
                        </summary>
                        {t.emailHtml ? (
                          <iframe
                            className="w-full h-72 rounded-sm border border-border bg-white mt-2"
                            sandbox=""
                            title={`${t.title} email preview`}
                            srcDoc={t.emailHtml}
                          />
                        ) : (
                          <p className="text-xs text-muted mt-1 mb-2">
                            Email template could not be rendered.
                          </p>
                        )}
                      </details>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      {/* Integration status (superadmin) */}
      {isSuperadmin && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted tracking-tight">Integration Status</h2>
          <SectionCard title="Integration Status" icon={<ShieldCheck size={16} />}>
            {!integrations ? (
              <div className="h-24 rounded-xl content-panel animate-pulse opacity-60" />
            ) : (
              <ul className="divide-y divide-border">
                <li className="flex items-center justify-between py-2.5 first:pt-0">
                  <span className="text-sm">Email (status notifications)</span>
                  {integrations.email.configured ? (
                    <Chip size="sm" variant="soft" color="success">
                      Configured · {integrations.email.provider ?? 'mail'}
                    </Chip>
                  ) : (
                    <Chip size="sm" variant="soft" color="danger">
                      Not configured
                    </Chip>
                  )}
                </li>
                <li className="flex items-center justify-between py-2.5">
                  <span className="text-sm">WhatsApp (MSG91)</span>
                  {integrations.whatsapp.configured ? (
                    <Chip size="sm" variant="soft" color="success">
                      Configured
                    </Chip>
                  ) : (
                    <Chip size="sm" variant="soft" color="warning">
                      Not configured
                    </Chip>
                  )}
                </li>
                <li className="flex items-center justify-between py-2.5">
                  <span className="text-sm">17TRACK carrier tracking</span>
                  {integrations.track17.configured ? (
                    <Chip size="sm" variant="soft" color="success">
                      API key set
                    </Chip>
                  ) : (
                    <Chip size="sm" variant="soft" color="warning">
                      No API key
                    </Chip>
                  )}
                </li>
              </ul>
            )}
          </SectionCard>
        </section>
      )}
    </div>
  );
}
