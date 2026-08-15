/**
 * Reposcope — brand identity.
 * Everything user-facing that names the product lives here (or imports from here),
 * so a rename is a one-file change.
 */

export const BRAND = {
  /** Product name (short form). */
  name: 'Reposcope',
  /** Name as it appears in titles / headers. */
  title: 'Reposcope',
  /** One-line positioning statement. */
  tagline: 'Open source, measured in real time.',
  /** Full product description for metadata / SEO. */
  description:
    'Reposcope analyzes 10+ billion GitHub events to track stars, contributors, pull requests, issues, and the repositories shaping software — measured in real time.',
  /** Canonical domain (no trailing slash). */
  domain: 'https://reposcope.io',
  /** Social handle without @. */
  twitter: 'reposcope',
  /** Organization name used in structured data / footer. */
  orgName: 'Reposcope',
  /** GA measurement IDs — replace with your own. */
  ga: {
    tag: 'GTM-XXXXXXX',
    measurementId: 'G-XXXXXXXXXX',
  },
} as const;

export const BRAND_NAME = BRAND.name;
export const BRAND_TAGLINE = BRAND.tagline;
export const BRAND_DESCRIPTION = BRAND.description;
export const BRAND_DOMAIN = BRAND.domain;
export const BRAND_TWITTER = BRAND.twitter;
