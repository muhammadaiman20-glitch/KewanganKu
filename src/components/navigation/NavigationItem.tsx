import React from 'react';
import type { NavigationDestination } from './navigationConfig';

export function NavigationBadge({ count = 0 }: { count?: number }) {
  if (count <= 0) return null;
  return <span className="navigation-badge" aria-hidden="true">{count > 99 ? '99+' : count}</span>;
}

export function NavigationItem({ destination, active, count = 0, onSelect, compact = false }: {
  destination: NavigationDestination;
  active: boolean;
  count?: number;
  onSelect: () => void;
  compact?: boolean;
}) {
  const Icon = destination.icon;
  return <button type="button" className={`navigation-item${active ? ' is-active' : ''}${compact ? ' is-secondary' : ''}${destination.id === 'ocr' ? ' is-scan' : ''}`}
    aria-current={active ? 'page' : undefined}
    aria-label={`${destination.label}${count > 0 ? `, ${count} peringatan` : ''}`} onClick={onSelect}>
    <span className="navigation-icon"><Icon size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" /><NavigationBadge count={count} /></span>
    <span className="navigation-label">{destination.label}</span>
    {compact && active && <span className="navigation-current" aria-hidden="true">Semasa</span>}
  </button>;
}
