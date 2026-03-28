import type { LucideIcon } from 'lucide-react';
import { Home, Lightbulb, MapPin, CalendarDays, Phone, AlignJustify } from 'lucide-react';

export const SECTION_ICONS: Record<string, LucideIcon> = {
  hero: Home,
  koncept: Lightbulb,
  miejsce: MapPin,
  rezerwacja: CalendarDays,
  stopka: Phone,
  menu: AlignJustify,
};
