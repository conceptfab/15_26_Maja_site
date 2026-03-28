import { getHomeContent } from '@/lib/content';
import { getSettings } from '@/actions/settings';
import { getActivePricingRules } from '@/actions/pricing';
import { HomeClient } from '@/components/HomeClient';

export const revalidate = 60;

export default async function Home() {
  const [sections, settings, pricingRules] = await Promise.all([
    getHomeContent(),
    getSettings(),
    getActivePricingRules(),
  ]);

  return <HomeClient sections={sections} settings={settings} pricingRules={pricingRules} />;
}
