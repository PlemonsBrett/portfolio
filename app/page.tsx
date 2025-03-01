import { getHomepageContent } from '@/lib/cms';
import HomePage from '@/components/HomePage';

export default async function Home() {
  const homepage = await getHomepageContent();

  return (
    <HomePage
      title={homepage.title}
      subtitle={homepage.subtitle}
      ctaText={homepage.ctaText}
      ctaLink={homepage.ctaLink}
    />
  );
}
