import { getHomeContent } from '@/lib/content';
import { HomeClient } from '@/components/HomeClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const sections = await getHomeContent();

  return <HomeClient sections={sections} />;
}
