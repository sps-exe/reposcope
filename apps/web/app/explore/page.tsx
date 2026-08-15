import type { Metadata } from 'next';
import { BreadcrumbListJsonLd } from '@/components/json-ld';
import { ExploreMaintenance } from './maintenance';

export const metadata: Metadata = {
  title: 'Data Explorer',
  description: 'Ask questions about GitHub data in natural language — Reposcope generates SQL, queries 10+ billion events, and visualizes the results.',
  openGraph: {
    title: 'Data Explorer | Reposcope',
    description: 'Ask questions about GitHub data in natural language — Reposcope generates SQL, queries 10+ billion events, and visualizes the results.',
  },
  twitter: {
    title: 'Data Explorer | Reposcope',
    description: 'Ask questions about GitHub data in natural language — Reposcope generates SQL, queries 10+ billion events, and visualizes the results.',
    card: 'summary_large_image',
  },
  alternates: { canonical: '/explore' },
};

export default function ExplorePage() {
  return (
    <>
      <BreadcrumbListJsonLd items={[
        { name: 'Home', url: '/' },
        { name: 'Data Explorer' },
      ]} />
      <ExploreMaintenance />
    </>
  );
}
