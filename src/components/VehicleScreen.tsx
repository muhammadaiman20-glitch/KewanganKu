import React, { useState } from 'react';
import {
  Car,
  Plus,
  Wrench,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  FileText,
  X,
  Gauge,
  CheckCircle2,
} from 'lucide-react';
import { VehicleItem, VehicleServiceLog } from '../types';
import { daysUntil, formatRM } from '../services/storage';

interface VehicleScreenProps {
  vehicles: VehicleItem[];
  onAddVehicle: (veh: Omit<VehicleItem, 'id' | 'services'>) => void;
  onRecordService: (vehId: string, service: Omit<VehicleServiceLog, 'id' | 'vehicleId'>) => void;
  onUpdateOdometer: (vehId: string, newOdometer: number) => void;
}

export const VehicleScreen: React.FC<VehicleScreenProps> = ({
  vehicles,
  onAddVehicle,
  onRecordService,
  onUpdateOdometer,
}) => {
  const [selectedVehId, setSelectedVehId] = useState<string>(vehicles[0]?.id || '');
  const [isAddVehModalOpen, setIsAddVehModalOpen] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);

  // New vehicle form
  const [name, setName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [type, setType] = useState<VehicleItem['type']>('car');
  const [year, setYear] = useState('2023');
  const [odometer, setOdometer] = useState('35000');
  const [roadTaxExpiry, setRoadTaxExpiry] = useState(
    new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [insuranceExpiry, setInsuranceExpiry] = useState(
    new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [insuranceProvider, setInsuranceProvider] = useState('Etiqa Takaful');
  const [serviceIntervalKm, setServiceIntervalKm] = useState('10000');

  // Service form
  const [serviceCost, setServiceCost] = useState('250.00');
  const [serviceWorkshop, setServiceWorkshop] = useState('Pusat Servis Rasmi');
  const [serviceItems, setServiceItems] = useState(
    'Minyak Enjin Fully Synthetic, Penapis Minyak, Pemeriksaan Brek'
  );
  const [serviceOdo, setServiceOdo] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');

  const currentVehicle = vehicles.find((v) => v.id === selectedVehId) || vehicles[0];

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !plateNumber) return;

    const currentOdo = parseInt(odometer, 10) || 0;
    const intervalKm = parseInt(serviceIntervalKm, 10) || 10000;

    const nextServDate = new Date();
    nextServDate.setMonth(nextServDate.getMonth() + 6);

    onAddVehicle({
      name,
      plateNumber: plateNumber.toUpperCase().trim(),
      type,
      year: parseInt(year, 10) || 2022,
      currentOdometer: currentOdo,
      roadTaxExpiry,
      insuranceExpiry,
      insuranceProvider,
      nextServiceOdometer: currentOdo + intervalKm,
      nextServiceDate: nextServDate.toISOString().split('T')[0],
      serviceIntervalKm: intervalKm,
    });

    setIsAddVehModalOpen(false);
    setName('');
    setPlateNumber('');
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVehicle || !serviceCost) return;

    const odoNum = parseInt(serviceOdo || currentVehicle.currentOdometer.toString(), 10);
    const itemsList = serviceItems
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    onRecordService(currentVehicle.id, {
      date: new Date().toISOString().split('T')[0],
      odometer: odoNum,
      cost: parseFloat(serviceCost) || 0,
      workshop: serviceWorkshop,
      items: itemsList,
      notes: serviceNotes,
    });

    setIsAddServiceModalOpen(false);
    setServiceCost('');
    setServiceNotes('');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Car className="w-6 h-6 text-sky-400" />
            <span>Pengurusan Kenderaan & Servis</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Pantau tarikh luput cukai jalan, insurans perlindungan, dan rekod servis berkala.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (currentVehicle) {
                setServiceOdo(currentVehicle.currentOdometer.toString());
              }
              setIsAddServiceModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-sky-500/40 text-sky-400 hover:bg-slate-800 text-xs font-bold shadow-md transition"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Rekod Servis</span>
          </button>
          <button
            onClick={() => setIsAddVehModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-lg shadow-sky-950/40 transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tambah Kenderaan</span>
          </button>
        </div>
      </div>

      {/* Vehicle Switcher Carousel */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {vehicles.map((v) => {
          const isSelected = v.id === currentVehicle?.id;
          const roadtaxDays = daysUntil(v.roadTaxExpiry);

          return (
            <button
              key={v.id}
              onClick={() => setSelectedVehId(v.id)}
              className={`flex-shrink-0 text-left p-4 rounded-3xl border transition-all min-w-[240px] ${
                isSelected
                  ? 'bg-gradient-to-br from-[#0c1f36] to-[#081324] border-sky-500/60 shadow-lg shadow-sky-950/40'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-black/60 border border-slate-700 text-amber-300">
                  {v.plateNumber}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {v.year}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-2 truncate">{v.name}</h4>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                <span>{v.currentOdometer.toLocaleString()} km</span>
                <span
                  className={
                    roadtaxDays <= 30
                      ? 'text-amber-400 font-bold'
                      : 'text-emerald-400 font-medium'
                  }
                >
                  {roadtaxDays <= 0 ? 'Cukai Tamat' : `Cukai: ${roadtaxDays}h`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {currentVehicle && (
        <>
          {/* Active Vehicle Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Road Tax Card */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Status Cukai Jalan (Road Tax)</h4>
                    <p className="text-xs text-slate-400">Peringatan JPJ Malaysia</p>
                  </div>
                </div>

                {daysUntil(currentVehicle.roadTaxExpiry) <= 30 ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Perlu Diperbaharui
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Masih Sah
                  </span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[#0b1220] border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Tarikh Luput</span>
                  <span className="text-base font-bold text-white">
                    {currentVehicle.roadTaxExpiry}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Kiraan Hari</span>
                  <span
                    className={`text-lg font-black ${
                      daysUntil(currentVehicle.roadTaxExpiry) <= 30
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {daysUntil(currentVehicle.roadTaxExpiry) > 0
                      ? `${daysUntil(currentVehicle.roadTaxExpiry)} Hari Lagi`
                      : 'Telah Tamat'}
                  </span>
                </div>
              </div>
            </div>

            {/* Insurance Card */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Insurans & Takaful</h4>
                    <p className="text-xs text-slate-400">{currentVehicle.insuranceProvider}</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  Komprehensif 1st Party
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0b1220] border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Tarikh Luput</span>
                  <span className="text-base font-bold text-white">
                    {currentVehicle.insuranceExpiry}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Kiraan Hari</span>
                  <span
                    className={`text-lg font-black ${
                      daysUntil(currentVehicle.insuranceExpiry) <= 30
                        ? 'text-amber-400'
                        : 'text-sky-400'
                    }`}
                  >
                    {daysUntil(currentVehicle.insuranceExpiry) > 0
                      ? `${daysUntil(currentVehicle.insuranceExpiry)} Hari Lagi`
                      : 'Telah Tamat'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Periodic Service Reminder Tracker */}
          <div className="rounded-3xl bg-gradient-to-br from-[#0c1a2d] to-[#081220] border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Peringatan Servis Berkala</h3>
                  <p className="text-xs text-slate-400">
                    Selang servis: setiap {currentVehicle.serviceIntervalKm.toLocaleString()} km
                    atau 6 bulan.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setServiceOdo(currentVehicle.currentOdometer.toString());
                  setIsAddServiceModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md transition self-start sm:self-center"
              >
                + Catat Servis Selesai
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-[#09101c] border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Odometer Semasa</span>
                <span className="text-lg font-extrabold text-white">
                  {currentVehicle.currentOdometer.toLocaleString()} km
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#09101c] border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Sasaran Servis Seterusnya</span>
                <span className="text-lg font-extrabold text-sky-400">
                  {currentVehicle.nextServiceOdometer.toLocaleString()} km
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#09101c] border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Baki Jarak Sebelum Servis</span>
                <span
                  className={`text-lg font-extrabold ${
                    currentVehicle.nextServiceOdometer - currentVehicle.currentOdometer <= 1000
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {(currentVehicle.nextServiceOdometer - currentVehicle.currentOdometer).toLocaleString()} km lagi
                </span>
              </div>
            </div>
          </div>

          {/* Past Service History Logs */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Rekod Sejarah Servis ({currentVehicle.services.length})</span>
            </h4>

            {currentVehicle.services.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Belum ada rekod servis untuk kenderaan ini. Tekan butang 'Rekod Servis' di atas.
              </p>
            ) : (
              <div className="space-y-3">
                {currentVehicle.services.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-4 rounded-2xl bg-[#0b1220] border border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-white">{srv.workshop}</h5>
                        <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{srv.date}</span>
                          <span>•</span>
                          <span>{srv.odometer.toLocaleString()} km</span>
                        </p>
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-sky-400">
                        {formatRM(srv.cost)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {srv.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>

                    {srv.notes && (
                      <p className="text-[11px] text-slate-400 italic pt-1">{srv.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Vehicle Modal */}
      {isAddVehModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsAddVehModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-400" />
              <span>Daftar Kenderaan Baharu</span>
            </h3>

            <form onSubmit={handleCreateVehicle} className="space-y-3.5 mt-5">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Model Kenderaan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth: Perodua Myvi 1.5 H, Honda City"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Nombor Plat *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: VHY 8821"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs font-mono uppercase focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Tahun</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Jenis Kenderaan
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as VehicleItem['type'])}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                  >
                    <option value="car">Kereta Sedan / Hatchback</option>
                    <option value="suv">SUV / MPV</option>
                    <option value="motorcycle">Motosikal</option>
                    <option value="other">Lain-lain</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Odometer Semasa (km)
                  </label>
                  <input
                    type="number"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Tarikh Luput Cukai Jalan
                  </label>
                  <input
                    type="date"
                    required
                    value={roadTaxExpiry}
                    onChange={(e) => setRoadTaxExpiry(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Tarikh Luput Insurans
                  </label>
                  <input
                    type="date"
                    required
                    value={insuranceExpiry}
                    onChange={(e) => setInsuranceExpiry(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Syarikat Insurans / Takaful
                </label>
                <input
                  type="text"
                  placeholder="cth: Etiqa Takaful, Allianz, Takaful Malaysia"
                  value={insuranceProvider}
                  onChange={(e) => setInsuranceProvider(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddVehModalOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-950/40 transition"
                >
                  Simpan Kenderaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Service Modal */}
      {isAddServiceModalOpen && currentVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsAddServiceModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-sky-400" />
              <span>Rekod Servis Kenderaan</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {currentVehicle.name} ({currentVehicle.plateNumber})
            </p>

            <form onSubmit={handleCreateService} className="space-y-3.5 mt-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Kos Servis (RM) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="250.00"
                    value={serviceCost}
                    onChange={(e) => setServiceCost(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Odometer Semasa (km) *
                  </label>
                  <input
                    type="number"
                    required
                    value={serviceOdo}
                    onChange={(e) => setServiceOdo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Nama Bengkel / Pusat Servis *
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth: Pusat Servis Perodua Bangi"
                  value={serviceWorkshop}
                  onChange={(e) => setServiceWorkshop(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Item / Komponen Diservis (Asingkan dengan koma)
                </label>
                <textarea
                  rows={2}
                  placeholder="Minyak Enjin Fully Synthetic, Penapis Minyak, Spark Plug..."
                  value={serviceItems}
                  onChange={(e) => setServiceItems(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Nota</label>
                <input
                  type="text"
                  placeholder="cth: Tayar depan perlu ditukar dalam servis seterusnya"
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0b1220] border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddServiceModalOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-950/40 transition"
                >
                  Simpan & Jadual Seterusnya
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
