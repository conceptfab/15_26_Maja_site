import { getHomeContent } from '@/lib/content';
import { getSettings } from '@/actions/settings';
import { HomeClient } from '@/components/HomeClient';

export const revalidate = 60;

export default async function Home() {
  const [sections, settings] = await Promise.all([getHomeContent(), getSettings()]);

  return <HomeClient sections={sections} settings={settings} />;
}
