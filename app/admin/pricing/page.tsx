import { AdminShell } from '@/components/admin/AdminShell';
import { getPricingRules } from '@/actions/pricing';
import { getSettings } from '@/actions/settings';
import { PricingClient } from './PricingClient';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const [rules, settings] = await Promise.all([getPricingRules(), getSettings()]);

  return (
    <AdminShell>
      <PricingClient
        initialRules={rules}
        initialSettings={{
          pricePerNight: settings.pricePerNight,
          priceWeekend: settings.priceWeekend,
          priceSeasonHigh: settings.priceSeasonHigh,
          priceSeasonLow: settings.priceSeasonLow,
          seasonHighStart: settings.seasonHighStart,
          seasonHighEnd: settings.seasonHighEnd,
          longStayDiscount: settings.longStayDiscount,
          longStayThreshold: settings.longStayThreshold,
          depositPercent: settings.depositPercent,
        }}
      />
    </AdminShell>
  );
}
