import { defineSiteConfig } from './utils/siteConfig';
import { createAppHeaderConfig } from '@repo/site-shell';
import type { SiteHeaderConfig } from '@/components/ui/types/ui-config';
import { BRAND } from './lib/brand';

export default defineSiteConfig({
  host: process.env.NEXT_PUBLIC_SITE_HOST || BRAND.domain,
  ga: BRAND.ga,
  banner: {
    content: 'Reposcope — open source analytics, measured in real time.',
  },
  // site-shell's header config type is structurally the same as ui-config's;
  // the two interfaces diverged during the monorepo migration.
  header: createAppHeaderConfig('web') as unknown as SiteHeaderConfig,
});
