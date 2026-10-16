import React, { useState } from 'react';
import {
  Repeat,
  Plus,
  Sparkles,
  Calendar,
  AlertCircle,
  Tv,
  Music,
  Droplets,
  Wifi,
  Bot,
  Cloud,
  X,
  CreditCard,
  Check,
  Pause,
  Trash2,
} from 'lucide-react';
import { SubscriptionItem } from '../types';
import { daysUntil, formatRM } from '../services/storage';

interface SubscriptionScreenProps {
  subscriptions: SubscriptionItem[];
  onAddSubscription: (sub: Omit<SubscriptionItem, 'id'>) => void;
  onUpdateStatus: (id: string, status: SubscriptionItem['status']) => void;
  onDeleteSubscription: (id: string) => void;
  onOpenOcrWithModule: (moduleHint: 'subscription') => void;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  subscriptions,
  onAddSubscription,
  onUpdateStatus,
  onDeleteSubscription,
  onOpenOcrWithModule,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<SubscriptionItem['category']>('entertainment');
  const [newBillingCycle, setNewBillingCycle] = useState<SubscriptionItem['billingCycle']>('monthly');
  const [newRenewalDate, setNewRenewalDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPaymentMethod, setNewPaymentMethod] = useState('Maybank Visa');
  const [newNotes, setNewNotes] = useState('');

  const monthlyTotal = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => {
      if (s.billingCycle === 'yearly') return sum + s.amount / 12;
      return sum + s.amount;
    }, 0);

  const yearlyTotal = monthlyTotal * 12;

  const filteredSubs = subscriptions.filter((s) => {
    if (categoryFilter === 'all') return true;
    return s.category === categoryFilter;
  });

  const handleCreateSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAmount) return;

    onAddSubscription({
      name: newName,
      amount: parseFloat(newAmount) || 0,
      category: newCategory,
      billingCycle: newBillingCycle,
      renewalDate: newRenewalDate,
      paymentMethod: newPaymentMethod,
      status: 'active',
      notes: newNotes,
    });

    setIsAddModalOpen(false);
    setNewName('');
    setNewAmount('');
    setNewNotes('');
  };

  const getSubIcon = (name: string, category: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('netflix') || lower.includes('disney') || lower.includes('youtube')) {
      return <Tv className="w-5 h-5 text-red-400" />;
    }
    if (lower.includes('spotify') || lower.includes('apple music')) {
      return <Music className="w-5 h-5 text-emerald-400" />;
    }
    if (lower.includes('coway') || lower.includes('cuckoo') || lower.includes('water')) {
      return <Droplets className="w-5 h-5 text-sky-400" />;
    }
    if (lower.includes('unifi') || lower.includes('maxis') || lower.includes('time') || lower.includes('fibre')) {
      return <Wifi className="w-5 h-5 text-amber-400" />;
    }
    if (lower.includes('gpt') || lower.includes('claude') || lower.includes('ai')) {
      return <Bot className="w-5 h-5 text-purple-400" />;
    }
    return <Repeat className="w-5 h-5 text-teal-400" />;
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Repeat className="w-6 h-6 text-teal-400" />
            <span>Pengurusan Langganan & Servis</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Kawal perbelanjaan berulang: hiburan, utiliti penapis air, internet, dan perisian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenOcrWithModule('subscription')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-teal-500/40 text-teal-400 hover:bg-slate-800 text-xs font-bold shadow-md transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Imbas Invois Langganan</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-950/40 transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tambah Langganan</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0a1a24] to-[#08101e] border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-slate-400 font-medium">Jumlah Bulanan</span>
            <h3 className="text-2xl sm:text-3xl font-black text-teal-400 mt-1">
              {formatRM(monthlyTotal)}
              <span className="text-xs font-normal text-slate-400 ml-1">/ bulan</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              {subscriptions.filter((s) => s.status === 'active').length} servis sedang aktif
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 font-medium">Anggaran Setahun</span>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {formatRM(yearlyTotal)}
              <span className="text-xs font-normal text-slate-400 ml-1">/ tahun</span>
            </h3>
            <span className="text-[11px] text-teal-400">
              Kiraan termasuk bil tahunan & bulanan
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 font-medium">Servis Seterusnya</span>
            {subscriptions.length > 0 ? (
              <div className="mt-1">
                <span className="text-sm font-bold text-white block">
                  {subscriptions[0].name}
                </span>
                <span className="text-xs font-semibold text-amber-400">
                  {daysUntil(subscriptions[0].renewalDate) <= 0
                    ? 'Hari ini!'
                    : `Baki ${daysUntil(subscriptions[0].renewalDate)} hari (${subscriptions[0].renewalDate})`}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-1">Tiada servis berdaftar</p>
            )}
          </div>
        </div>
      </div>

      {/* Filter Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'all', label: 'Semua' },
          { id: 'entertainment', label: 'Hiburan (Netflix, Spotify)' },
          { id: 'utilities', label: 'Utiliti & Air (Coway, Unifi)' },
          { id: 'productivity', label: 'Produktiviti & AI' },
          { id: 'lifestyle', label: 'Gaya Hidup & Gym' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              categoryFilter === cat.id
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Subscription Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSubs.map((sub) => {
          const daysLeft = daysUntil(sub.renewalDate);

          return (
            <div
              key={sub.id}
              className={`rounded-3xl border p-5 shadow-lg transition space-y-4 ${
                sub.status === 'active'
                  ? 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700'
                  : 'bg-slate-900/40 border-slate-800/40 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0">
                    {getSubIcon(sub.name, sub.category)}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white">{sub.name}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{sub.paymentMethod}</span>
                      <span>•</span>
                      <span className="capitalize">{sub.billingCycle}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-teal-400">
                    {formatRM(sub.amount)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    /{sub.billingCycle === 'monthly' ? 'bln' : 'thn'}
                  </span>
                </div>
              </div>

              {/* Renewal Date Status */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0b1220] border border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Pembaharuan: {sub.renewalDate}</span>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    daysLeft <= 3
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : daysLeft <= 7
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {daysLeft <= 0 ? 'Hari ini' : `Baki ${daysLeft} hari`}
                </span>
              </div>

              {sub.notes && (
                <p className="text-[11px] text-slate-400 italic">"{sub.notes}"</p>
              )}

              {/* Action Controls */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onUpdateStatus(sub.id, sub.status === 'active' ? 'paused' : 'active')
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
                  >
                    {sub.status === 'active' ? (
                      <>
                        <Pause className="w-3 h-3 text-amber-400" />
                        <span>Jeda</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Aktifkan</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => onDeleteSubscription(sub.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                    title="Padam Langganan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    sub.status === 'active' ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  Status: {sub.status === 'active' ? 'Aktif' : 'Dijeda'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Subscription Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-teal-400" />
              <span>Tambah Langganan Baharu</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Daftar komitmen berkala seperti Netflix, Spotify, Coway, atau bil internet.
            </p>

            <form onSubmit={handleCreateSub} className="space-y-3.5 mt-5">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Nama Servis / Langganan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth: Netflix Premium, Coway Ombak"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Amaun (RM) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="54.90"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Kitaran Bil
                  </label>
                  <select
                    value={newBillingCycle}
                    onChange={(e) =>
                      setNewBillingCycle(e.target.value as SubscriptionItem['billingCycle'])
                    }
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-400"
                  >
                    <option value="monthly">Bulanan</option>
                    <option value="yearly">Tahunan</option>
                    <option value="quarterly">Suku Tahunan (3 Bulan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Kategori
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as SubscriptionItem['category'])
                    }
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-400"
                  >
                    <option value="entertainment">Hiburan</option>
                    <option value="utilities">Utiliti & Rumah</option>
                    <option value="productivity">Produktiviti & AI</option>
                    <option value="lifestyle">Gaya Hidup & Sukan</option>
                    <option value="other">Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Tarikh Baharu Seterusnya
                  </label>
                  <input
                    type="date"
                    required
                    value={newRenewalDate}
                    onChange={(e) => setNewRenewalDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Kaedah Pembayaran
                </label>
                <input
                  type="text"
                  placeholder="cth: Maybank Visa, Autodebit, Touch n Go"
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Nota</label>
                <textarea
                  rows={2}
                  placeholder="cth: Berkongsi akaun bersama adik beradik..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-950/40 transition"
                >
                  Simpan Langganan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
