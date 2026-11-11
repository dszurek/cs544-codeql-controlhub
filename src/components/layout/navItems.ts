import {
  TodayIcon,
  PlanIcon,
  StreamsIcon,
  BodyIcon,
  SpacesIcon,
  LibraryIcon,
} from './NavIcons';
import type { ComponentType } from 'react';

export interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType;
}

/**
 * The six surfaces. Organized around what you're doing, not what
 * type of data it is — see the overhaul design (Phase 1).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/',         label: 'Today',   Icon: TodayIcon },
  { href: '/plan',     label: 'Plan',    Icon: PlanIcon },
  { href: '/streams',  label: 'Streams', Icon: StreamsIcon },
  { href: '/body',     label: 'Body',    Icon: BodyIcon },
  { href: '/spaces',   label: 'Spaces',  Icon: SpacesIcon },
  { href: '/library',  label: 'Library', Icon: LibraryIcon },
];
