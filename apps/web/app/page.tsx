import type { Metadata } from 'next';
import { HomeContent } from './home-content';
import { FAQPageJsonLd, SiteApplicationJsonLd, WebPageJsonLd } from '@/components/json-ld';
import { FAQ_ITEMS } from './faq-data';
import ShareButtons from '@/components/ShareButtons';
import AIHomeContent from './ai-home-content';
import { getCategoryData, getAITrending, getTrendingForTreemap } from './ai-home-data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    absolute: 'Reposcope — Live Open Source GitHub Analytics',
  },
  description: 'Score any GitHub repository, watch live open source activity, compare projects side by side, and embed live README badges. Real-time GitHub analytics, free & open source.',
  keywords: [
    'open source analytics', 'GitHub insights', 'repository score',
    'trending repositories', 'repository comparison', 'developer analytics',
    'GitHub activity', 'open source intelligence', 'README badges',
  ],
  openGraph: {
    title: 'Reposcope — Live Open Source GitHub Analytics',
    description: 'Score any GitHub repository, watch live open source activity, compare projects side by side, and embed live README badges.',
    images: [{ url: '/seo-widgets-homepage.jpeg', width: 1200, height: 630, alt: 'Reposcope — Live Open Source GitHub Analytics' }],
  },
  twitter: {
    title: 'Reposcope — Live Open Source GitHub Analytics',
    description: 'Score any GitHub repository, watch live open source activity, compare projects side by side.',
    card: 'summary_large_image',
    images: ['/seo-widgets-homepage.jpeg'],
  },
};

export default async function HomePage() {
  const [categories, trendingRepos] = await Promise.all([
    getCategoryData(),
    getTrendingForTreemap(),
  ]);

  return (
    <>
      <WebPageJsonLd />
      <SiteApplicationJsonLd />
      <FAQPageJsonLd items={FAQ_ITEMS} />
      <div className="sr-only">
        <h1>Reposcope — Open Source Software Insight</h1>
        <p>
          Reposcope is a free analytics platform for the open source world. It provides deep insights into
          repositories, developers, and organizations — including stars, commits, pull requests, issues,
          contributors, and community health metrics — scored live from GitHub.
        </p>
      </div>
      <HomeContent
        aiSection={
          <AIHomeContent
            categories={categories}
            trendingRepos={trendingRepos}
          />
        }
      />
      <ShareButtons url="/" title="Reposcope — AI Open Source Intelligence" />
    </>
  );
}
