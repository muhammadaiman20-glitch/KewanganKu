import React, { useEffect, useId, useRef, useState } from 'react';
import { Grid2X2, X } from 'lucide-react';
import type { TabType } from '../types';
import { NavigationBadge, NavigationItem } from './navigation/NavigationItem';
import { NAVIGATION_DESTINATIONS, NAVIGATION_GROUPS, PRIMARY_DESTINATIONS, SECONDARY_DESTINATIONS, type NavigationBadgeKey } from './navigation/navigationConfig';
import './navigation/navigation.css';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  debtBadge?: number;
  billBadge?: number;
  subBadge?: number;
  vehicleBadge?: number;
}

export function BottomNavigation({ currentTab, onChangeTab, debtBadge = 0, billBadge = 0, subBadge = 0, vehicleBadge = 0 }: BottomNavProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const counts: Record<NavigationBadgeKey, number> = { debt: debtBadge, bills: billBadge, subscription: subBadge, vehicle: vehicleBadge };
  const selectedSecondary = SECONDARY_DESTINATIONS.find(item => item.id === currentTab);
  const secondaryCount = SECONDARY_DESTINATIONS.reduce((sum, item) => sum + (item.badge ? counts[item.badge] : 0), 0);
  const close = (restoreFocus = false) => { setExpanded(false); if (restoreFocus) trigger.current?.focus(); };
  useEffect(() => { setExpanded(false); }, [currentTab]);
  useEffect(() => {
    if (!expanded) return;
    panel.current?.querySelector<HTMLButtonElement>('button[aria-current="page"], button')?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setExpanded(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setExpanded(false); trigger.current?.focus(); } };
    const wide = window.matchMedia('(min-width: 960px)');
    const resized = () => { if (wide.matches) { setExpanded(false); const desktop = root.current?.querySelector<HTMLButtonElement>('.navigation-desktop button[aria-current="page"]'); desktop?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    wide.addEventListener('change', resized);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); wide.removeEventListener('change', resized); };
  }, [expanded]);
  const select = (id: TabType, fromPanel = false) => { close(fromPanel); onChangeTab(id); };
  return <nav ref={root} className="navigation-shell" aria-label="Navigasi utama" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setExpanded(false); }}>
    <div className="navigation-container">
      {expanded && <section ref={panel} id={panelId} className="navigation-panel" aria-label="Destinasi lain">
        <div className="navigation-panel-heading"><h2>Semua modul</h2><button type="button" className="navigation-close" aria-label="Tutup menu" onClick={() => close(true)}><X size={20} aria-hidden="true" /></button></div>
        {NAVIGATION_GROUPS.map(group => {
          const destinations = SECONDARY_DESTINATIONS.filter(item => item.group === group);
          return <div className="navigation-group" key={group}><h3>{group}</h3><div className="navigation-group-items">{destinations.map(item => <NavigationItem key={item.id} destination={item} compact active={currentTab === item.id} count={item.badge ? counts[item.badge] : 0} onSelect={() => select(item.id, true)} />)}</div></div>;
        })}
      </section>}
      <div className="navigation-mobile">
        {PRIMARY_DESTINATIONS.map(item => <NavigationItem key={item.id} destination={item} active={currentTab === item.id} count={item.badge ? counts[item.badge] : 0} onSelect={() => select(item.id)} />)}
        <button ref={trigger} type="button" className={`navigation-item navigation-more${selectedSecondary || expanded ? ' is-active' : ''}`} aria-expanded={expanded} aria-controls={panelId}
          aria-label={`Lain-lain${selectedSecondary ? `, ${selectedSecondary.label} dipilih` : ''}${secondaryCount > 0 ? `, ${secondaryCount} peringatan` : ''}`} onClick={() => setExpanded(value => !value)}>
          <span className="navigation-icon"><Grid2X2 size={22} strokeWidth={1.75} aria-hidden="true" /><NavigationBadge count={secondaryCount} /></span>
          <span className="navigation-label">{selectedSecondary?.label || 'Lain-lain'}</span>
        </button>
      </div>
      <div className="navigation-desktop">{NAVIGATION_DESTINATIONS.map(item => <NavigationItem key={item.id} destination={item} active={currentTab === item.id} count={item.badge ? counts[item.badge] : 0} onSelect={() => select(item.id)} />)}</div>
    </div>
  </nav>;
}
