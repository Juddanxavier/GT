'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, AlertTriangle, Shield, FileText, HelpCircle } from 'lucide-react';
import { FaqSection } from '@/components/sections/faq-section';

const items = [
  { icon: <svg viewBox="0 0 80 80" className="size-12"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient><filter id="s1"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00000030"/></filter></defs><rect x="12" y="20" width="56" height="36" rx="4" fill="url(#g1)" filter="url(#s1)"/><rect x="16" y="24" width="48" height="28" rx="2" fill="#fef3c7"/><text x="40" y="44" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#d97706">$</text></svg>, label: 'Currency', desc: 'Shipping of currency or cash is prohibited.', reason: 'Illegal to ship cash across borders under anti-money laundering laws.', example: 'Banknotes, coins, cheques, money orders', color: 'from-amber-100 to-amber-50 border-amber-200 text-amber-700' },
  { icon: <svg viewBox="0 0 80 80" className="size-12"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#2563eb"/></linearGradient><filter id="s2"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00000030"/></filter></defs><circle cx="40" cy="40" r="24" fill="url(#g2)" filter="url(#s2)"/><text x="40" y="48" textAnchor="middle" fontSize="28" fontWeight="bold" fill="white">!</text><circle cx="40" cy="28" r="3" fill="white"/></svg>, label: 'Hazardous', desc: 'Hazardous or dangerous goods are not allowed.', reason: 'Pose safety risks - leakage, fire, or explosion during transport.', example: 'Aerosols, batteries, flammables, corrosives', color: 'from-blue-100 to-blue-50 border-blue-200 text-blue-700' },
  { icon: <svg viewBox="0 0 80 80" className="size-12"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient><filter id="s3"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00000030"/></filter></defs><polygon points="40,16 52,36 48,36 56,52 24,52 32,36 28,36" fill="url(#g3)" filter="url(#s3)"/><polygon points="40,22 46,32 34,32" fill="white" opacity="0.3"/></svg>, label: 'Valuables', desc: 'Precious & Semi-Precious Items are not allowed.', reason: 'Require specialised insurance and handling procedures.', example: 'Gold, silver, diamonds, jewellery, antiques', color: 'from-purple-100 to-purple-50 border-purple-200 text-purple-700' },
  { icon: <svg viewBox="0 0 80 80" className="size-12"><defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#ef4444"/></linearGradient><filter id="s4"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00000030"/></filter></defs><rect x="20" y="16" width="16" height="20" rx="2" fill="url(#g4)" filter="url(#s4)"/><rect x="44" y="28" width="16" height="20" rx="2" fill="url(#g4)" filter="url(#s4)"/><rect x="14" y="52" width="52" height="6" rx="3" fill="#dc2626"/></svg>, label: 'Legal', desc: 'Legally restricted items are not permitted.', reason: 'Banned or regulated by customs laws in origin or destination.', example: 'Weapons, narcotics, counterfeit goods, ivory', color: 'from-red-100 to-red-50 border-red-200 text-red-700' },
  { icon: <svg viewBox="0 0 80 80" className="size-12"><defs><linearGradient id="g5" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fb923c"/><stop offset="100%" stopColor="#f97316"/></linearGradient><filter id="s5"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00000030"/></filter></defs><rect x="16" y="24" width="48" height="32" rx="4" fill="url(#g5)" filter="url(#s5)"/><rect x="28" y="16" width="24" height="12" rx="2" fill="#ea580c"/><line x1="32" y1="40" x2="48" y2="40" stroke="white" strokeWidth="3" strokeLinecap="round"/><line x1="40" y1="32" x2="40" y2="48" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>, label: 'Shipment Risk', desc: 'Shipments posing risk or delay are not allowed.', reason: 'Could compromise safety of other parcels or delay processing.', example: 'Used electronics, loose batteries, unboxed items', color: 'from-orange-100 to-orange-50 border-orange-200 text-orange-700' },
  { icon: <svg viewBox="0 0 80 80" className="size-12"><defs><linearGradient id="g6" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee"/><stop offset="100%" stopColor="#06b6d4"/></linearGradient><filter id="s6"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00000030"/></filter></defs><path d="M28 60 L28 36 C28 28 32 20 40 20 C48 20 52 28 52 36 L52 60" fill="url(#g6)" filter="url(#s6)"/><rect x="24" y="36" width="32" height="24" rx="4" fill="#0891b2"/><text x="40" y="54" textAnchor="middle" fontSize="18" fill="white" fontWeight="bold">Hâ‚‚O</text></svg>, label: 'Liquids', desc: 'Liquids and semi-liquids are prohibited.', reason: 'Risk of spillage and contamination of other shipments.', example: 'Perfumes, oils, paints, syrups, alcohol', color: 'from-cyan-100 to-cyan-50 border-cyan-200 text-cyan-700' },
  { icon: <svg viewBox="0 0 80 80" className="size-12"><defs><linearGradient id="g7" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6b7280"/><stop offset="100%" stopColor="#4b5563"/></linearGradient><filter id="s7"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00000030"/></filter></defs><circle cx="40" cy="40" r="26" fill="url(#g7)" filter="url(#s7)"/><line x1="22" y1="22" x2="58" y2="58" stroke="white" strokeWidth="4" strokeLinecap="round"/><line x1="58" y1="22" x2="22" y2="58" stroke="white" strokeWidth="4" strokeLinecap="round"/></svg>, label: 'Regulatory', desc: 'Goods banned by law may not be shipped.', reason: 'Subject to international sanctions, embargoes, or local laws.', example: 'Endangered species, cultural artifacts, military items', color: 'from-gray-100 to-gray-50 border-gray-200 text-gray-700' },
  { icon: <svg viewBox="0 0 80 80" className="size-12"><defs><linearGradient id="g8" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f87171"/><stop offset="50%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#fbbf24"/></linearGradient><filter id="s8"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00000030"/></filter></defs><circle cx="40" cy="40" r="26" fill="url(#g8)" filter="url(#s8)"/><circle cx="28" cy="36" r="4" fill="white" opacity="0.6"/><circle cx="52" cy="36" r="4" fill="white" opacity="0.6"/><path d="M26 48 C30 54 50 54 54 48" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>, label: 'Perishable', desc: 'Perishable food and beverages are not allowed.', reason: 'Will spoil in transit without temperature-controlled logistics.', example: 'Fresh food, dairy, frozen items, flowers', color: 'from-rose-100 to-amber-50 border-rose-200 text-rose-700' },
  { icon: <svg viewBox="0 0 80 80" className="size-12"><defs><linearGradient id="g9" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#d97706"/></linearGradient><filter id="s9"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00000030"/></filter></defs><ellipse cx="40" cy="52" rx="20" ry="12" fill="url(#g9)" filter="url(#s9)"/><circle cx="28" cy="36" r="10" fill="#92400e"/><circle cx="52" cy="36" r="10" fill="#78350f"/><circle cx="28" cy="32" r="4" fill="white" opacity="0.2"/></svg>, label: 'Living', desc: 'Shipping of live animals or plants is prohibited.', reason: 'Requires permits, vet checks, and climate-controlled transport.', example: 'Pets, livestock, plants, seeds, insects', color: 'from-amber-100 to-yellow-50 border-amber-200 text-amber-700' },
];

const exceptions = [
  { icon: Shield, title: 'Special Permits', desc: 'Some restricted items may ship with prior approval and proper documentation.' },
  { icon: FileText, title: 'Customs Clearance', desc: 'We help you navigate customs requirements for eligible items.' },
  { icon: HelpCircle, title: 'Not Sure?', desc: 'Contact us before booking. We will check if your item can be shipped.' },
];

export default function ProhibitedPage(): ReactNode {
  return (
    <div className="min-h-screen bg-white">
      <section className="w-screen left-[calc(-50vw+50%)] relative overflow-hidden min-h-[450px] md:min-h-[600px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img src="/images/about.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e] via-[#1a1a2e]/70 to-transparent" />
        </div>
        <div className="relative z-10 px-8 md:px-16 lg:px-24 w-full">
          <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-3">
            <span className="w-6 h-px bg-[#F59E0B]" />
            Restricted Items
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Prohibited Items</h1>
          <p className="text-lg text-white/90 max-w-lg mt-2">Certain items cannot be shipped for safety, legal, or regulatory reasons.</p>
        </div>
      </section>

      <section className="w-screen left-[calc(-50vw+50%)] relative bg-white">
        <div className="max-w-6xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="flex flex-col items-center text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Quick overview <span className="text-[#F59E0B]">by category</span>
            </h2>
            <p className="text-lg text-foreground/90 mt-3 max-w-xl">
              Browse the categories below, then check the reference table for full details.
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-12">
            {items.map((item, i) => (
              <motion.a
                key={item.label}
                href={`#${item.label.toLowerCase()}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className={`flex flex-col items-center text-center gap-2 p-4 rounded-2xl border bg-gradient-to-br ${item.color} transition-all hover:shadow-md hover:-translate-y-0.5`}
              >
                {item.icon}
                <span className="text-xs font-bold text-foreground">{item.label}</span>
              </motion.a>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="bg-surface-secondary/50 border-b border-border">
                    <th className="text-left px-5 py-4 text-sm font-bold text-foreground/80 uppercase tracking-wider">Category</th>
                    <th className="text-left px-5 py-4 text-sm font-bold text-foreground/80 uppercase tracking-wider">Description</th>
                    <th className="text-left px-5 py-4 text-sm font-bold text-foreground/80 uppercase tracking-wider">Why Restricted</th>
                    <th className="text-left px-5 py-4 text-sm font-bold text-foreground/80 uppercase tracking-wider">Examples</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.label} id={item.label.toLowerCase()} className="border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${item.color} shrink-0`}>
                            {item.icon}
                          </div>
                          <span className="font-bold text-foreground">{item.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-foreground/90">{item.desc}</td>
                      <td className="px-5 py-4 text-foreground/85 max-w-xs">{item.reason}</td>
                      <td className="px-5 py-4 text-foreground/85">{item.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="w-screen left-[calc(-50vw+50%)] relative bg-surface border-t border-border">
        <div className="max-w-5xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-sm font-semibold text-[#F59E0B] mb-4">
              <AlertTriangle size={14} />
              Need an exception?
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Special arrangements <span className="text-[#F59E0B]">may be possible</span>
            </h2>
            <p className="text-lg text-foreground/90 mt-3 max-w-xl">
              Some restricted items can be shipped with proper documentation, permits, or specialised handling.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 mb-10">
            {exceptions.map((e, i) => (
              <motion.div
                key={e.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="rounded-2xl bg-white border border-border p-6 text-center shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mx-auto mb-4">
                  <e.icon className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1.5">{e.title}</h3>
                <p className="text-base text-foreground/85 leading-relaxed">{e.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F59E0B] text-white text-base font-semibold hover:bg-[#D97706] transition-colors cursor-pointer">
              Contact Support <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </section>

      <FaqSection />
    </div>
  );
}

