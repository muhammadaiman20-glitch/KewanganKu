import React, { useState } from 'react';
import {
  Fuel,
  Plus,
  Sparkles,
  TrendingUp,
  DollarSign,
  Gauge,
  Calendar,
  MapPin,
  ChevronRight,
  X,
  Droplet,
} from 'lucide-react';
import { FuelLogItem, VehicleItem } from '../types';
import { formatRM } from '../services/storage';

interface FuelScreenProps {
  fuelLogs: FuelLogItem[];
  vehicles: VehicleItem[];
  onAddFuelLog: (log: Omit<FuelLogItem, 'id' | 'efficiencyKmPerLitre' | 'costPerKm' | 'distanceTrip'>) => void;
  onOpenOcrWithModule: (moduleHint: 'fuel') => void;
}

export const FuelScreen: React.FC<FuelScreenProps> = ({
  fuelLogs,
  vehicles,
  onAddFuelLog,
  onOpenOcrWithModule,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [formVehId, setFormVehId] = useState(vehicles[0]?.id || '');
  const [station, setStation] = useState('Petronas');
  const [fuelType, setFuelType] = useState<FuelLogItem['fuelType']>('RON95');
  const [amount, setAmount] = useState('60.00');
  const [litres, setLitres] = useState('29.27');
  const [pricePerLitre, setPricePerLitre] = useState('2.05');
  const [odometer, setOdometer] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const filteredLogs = fuelLogs
    .filter((log) => {
      if (selectedVehicleId === 'all') return true;
      return log.vehicleId === selectedVehicleId;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Metrics computation
  const totalFuelCost = filteredLogs.reduce((sum, l) => sum + l.amount, 0);
  const totalLitres = filteredLogs.reduce((sum, l) => sum + l.litres, 0);

  const logsWithEfficiency = filteredLogs.filter(
    (l) => l.efficiencyKmPerLitre && l.efficiencyKmPerLitre > 0
  );
  const avgEfficiency =
    logsWithEfficiency.length > 0
      ? (
          logsWithEfficiency.reduce((sum, l) => sum + (l.efficiencyKmPerLitre || 0), 0) /
          logsWithEfficiency.length
        ).toFixed(2)
      : '15.5';

  const logsWithCostPerKm = filteredLogs.filter((l) => l.costPerKm && l.costPerKm > 0);
  const avgCostPerKm =
    logsWithCostPerKm.length > 0
      ? (
          logsWithCostPerKm.reduce((sum, l) => sum + (l.costPerKm || 0), 0) /
          logsWithCostPerKm.length
        ).toFixed(3)
      : '0.132';

  const handleCreateFuelLog = (e: React.FormEvent) => {
    e.preventDefault();
    const veh = vehicles.find((v) => v.id === formVehId) || vehicles[0];
    if (!veh || !amount || !litres) return;

    onAddFuelLog({
      vehicleId: veh.id,
      vehiclePlate: veh.plateNumber,
      date,
      station,
      fuelType,
      amount: parseFloat(amount) || 0,
      litres: parseFloat(litres) || 0,
      pricePerLitre: parseFloat(pricePerLitre) || 2.05,
      odometer: parseInt(odometer || veh.currentOdometer.toString(), 10),
      notes,
    });

    setIsAddModalOpen(false);
    setAmount('');
    setLitres('');
    setNotes('');
  };

  const calculateLitresFromAmount = (amt: string, price: string) => {
    const a = parseFloat(amt);
    const p = parseFloat(price);
    if (!isNaN(a) && !isNaN(p) && p > 0) {
      setLitres((a / p).toFixed(2));
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Fuel className="w-6 h-6 text-emerald-400" />
            <span>Pengurusan Bahan Api & Minyak</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Log isian minyak, kiraan kecekapan km/L, purata RM/km, dan imbasan resit pam automatik.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenOcrWithModule('fuel')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 hover:bg-slate-800 text-xs font-bold shadow-md transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Imbas Resit Pam</span>
          </button>
          <button
            onClick={() => {
              const activeVeh = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
              if (activeVeh) {
                setFormVehId(activeVeh.id);
                setOdometer(activeVeh.currentOdometer.toString());
              }
              setIsAddModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-950/40 transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Log Isian Minyak</span>
          </button>
        </div>
      </div>

      {/* Vehicle Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedVehicleId('all')}
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            selectedVehicleId === 'all'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Semua Kenderaan
        </button>
        {vehicles.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedVehicleId(v.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              selectedVehicleId === v.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-amber-300">
              {v.plateNumber}
            </span>
            <span>{v.name}</span>
          </button>
        ))}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <span>Purata Kecekapan</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1.5">
            {avgEfficiency} <span className="text-xs font-normal text-slate-400">km/L</span>
          </p>
          <span className="text-[10px] text-emerald-500 font-medium">Berdasarkan log perjalanan</span>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span>Kos Per KM</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white mt-1.5">
            RM {avgCostPerKm} <span className="text-xs font-normal text-slate-400">/km</span>
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Kos penjimatan bahan api</span>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Droplet className="w-4 h-4 text-sky-400" />
            <span>Jumlah Liter</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white mt-1.5">
            {totalLitres.toFixed(1)} <span className="text-xs font-normal text-slate-400">L</span>
          </p>
          <span className="text-[10px] text-slate-400 font-medium">{filteredLogs.length} kali isian</span>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span>Jumlah Belanja</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white mt-1.5">
            {formatRM(totalFuelCost)}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Semua rekod terpilih</span>
        </div>
      </div>

      {/* Fuel Consumption Trend Bar Visualization */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0c1a2d] to-[#081220] border border-slate-800 p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Carta Penggunaan Minyak & Kecekapan</h4>
          </div>
          <span className="text-xs text-slate-400">Target Jimat &gt; 15.0 km/L</span>
        </div>

        {filteredLogs.length > 0 ? (
          <div className="space-y-3 pt-2">
            {filteredLogs.slice(0, 5).map((log) => {
              const eff = log.efficiencyKmPerLitre || 15.5;
              const barPercent = Math.min(100, Math.round((eff / 22) * 100));

              return (
                <div key={log.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {log.station} • {log.date}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono text-[11px]">
                        {formatRM(log.amount)} ({log.litres.toFixed(1)}L)
                      </span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {eff.toFixed(1)} km/L
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">Tiada rekod minyak ditemui.</p>
        )}
      </div>

      {/* Fuel History Table / Card List */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <span>Sejarah Log Isian Minyak ({filteredLogs.length})</span>
        </h4>

        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-2xl bg-[#0b1220] border border-slate-800/80 hover:border-slate-700 transition space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Fuel className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white">{log.station}</h5>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-amber-300 font-bold">{log.vehiclePlate}</span>
                      <span>•</span>
                      <span>{log.date}</span>
                      <span>•</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-emerald-400 font-bold">
                        {log.fuelType}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-white">{formatRM(log.amount)}</span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {log.litres.toFixed(2)} Liter @ RM{log.pricePerLitre.toFixed(2)}/L
                  </span>
                </div>
              </div>

              {/* Mileage & Efficiency Metrics */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Odometer</span>
                  <span className="font-mono font-bold text-slate-200">
                    {log.odometer.toLocaleString()} km
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Kecekapan</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {log.efficiencyKmPerLitre ? `${log.efficiencyKmPerLitre.toFixed(2)} km/L` : '15.5 km/L'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Kos / KM</span>
                  <span className="font-mono font-bold text-amber-300">
                    {log.costPerKm ? `RM ${log.costPerKm.toFixed(3)}` : 'RM 0.132'}
                  </span>
                </div>
              </div>

              {log.notes && (
                <p className="text-[11px] text-slate-400 italic">"{log.notes}"</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Fuel Log Modal */}
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
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>Log Isian Minyak Baharu</span>
            </h3>

            <form onSubmit={handleCreateFuelLog} className="space-y-3.5 mt-5">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Pilih Kenderaan *
                </label>
                <select
                  value={formVehId}
                  onChange={(e) => {
                    setFormVehId(e.target.value);
                    const v = vehicles.find((x) => x.id === e.target.value);
                    if (v) setOdometer(v.currentOdometer.toString());
                  }}
                  className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-400"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plateNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Stesen Minyak *
                  </label>
                  <select
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-400"
                  >
                    <option value="Petronas">Petronas</option>
                    <option value="Shell">Shell</option>
                    <option value="BHPetrol">BHPetrol</option>
                    <option value="Petron">Petron</option>
                    <option value="Caltex">Caltex</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Gred Minyak
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => {
                      const ft = e.target.value as FuelLogItem['fuelType'];
                      setFuelType(ft);
                      if (ft === 'RON95') setPricePerLitre('2.05');
                      if (ft === 'RON97') setPricePerLitre('3.19');
                      if (ft === 'Diesel') setPricePerLitre('2.95');
                    }}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-400"
                  >
                    <option value="RON95">RON 95 (RM 2.05/L)</option>
                    <option value="RON97">RON 97 (RM 3.19/L)</option>
                    <option value="Diesel">Diesel Euro 5</option>
                    <option value="RON100">RON 100</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Jumlah Bayaran (RM) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="60.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      calculateLitresFromAmount(e.target.value, pricePerLitre);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Jumlah Liter (L) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="29.27"
                    value={litres}
                    onChange={(e) => setLitres(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Odometer Semasa (km) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="38500"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Tarikh Isian
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Nota</label>
                <input
                  type="text"
                  placeholder="cth: Isi penuh sebelum balik kampung cuti sekolah..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-400"
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
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 transition"
                >
                  Simpan & Kira Kecekapan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
