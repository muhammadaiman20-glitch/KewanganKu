import { LayoutDashboard, CreditCard, Repeat, Car, Fuel, ScanLine, Settings, ChartNoAxesCombined, ReceiptText, type LucideIcon } from 'lucide-react';
import type { TabType } from '../../types';

export type NavigationBadgeKey = 'debt' | 'bills' | 'subscription' | 'vehicle';
export interface NavigationDestination {
  id: TabType;
  label: string;
  icon: LucideIcon;
  group: 'Kewangan' | 'Kenderaan' | 'Aplikasi';
  badge?: NavigationBadgeKey;
}
export const NAVIGATION_DESTINATIONS: NavigationDestination[] = [
  { id: 'dashboard', label: 'Utama', icon: LayoutDashboard, group: 'Kewangan' },
  { id: 'bills', label: 'Bil', icon: ReceiptText, group: 'Kewangan', badge: 'bills' },
  { id: 'debt', label: 'Hutang', icon: CreditCard, group: 'Kewangan', badge: 'debt' },
  { id: 'ocr', label: 'Imbas', icon: ScanLine, group: 'Aplikasi' },
  { id: 'subscription', label: 'Langganan', icon: Repeat, group: 'Kewangan', badge: 'subscription' },
  { id: 'analysis', label: 'Analisis', icon: ChartNoAxesCombined, group: 'Kewangan' },
  { id: 'vehicle', label: 'Kenderaan', icon: Car, group: 'Kenderaan', badge: 'vehicle' },
  { id: 'fuel', label: 'Minyak', icon: Fuel, group: 'Kenderaan' },
  { id: 'settings', label: 'Tetapan', icon: Settings, group: 'Aplikasi' },
];
const PRIMARY_IDS: TabType[] = ['dashboard', 'debt', 'ocr', 'fuel'];
export const PRIMARY_DESTINATIONS = PRIMARY_IDS.map(id => NAVIGATION_DESTINATIONS.find(item => item.id === id)!);
export const SECONDARY_DESTINATIONS = NAVIGATION_DESTINATIONS.filter(item => !PRIMARY_IDS.includes(item.id));
export const NAVIGATION_GROUPS = ['Kewangan', 'Kenderaan', 'Aplikasi'] as const;
