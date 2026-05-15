import { Helmet } from "react-helmet-async"

const SITE_URL = "https://ai-debate.sdee3.com"
const SITE_NAME = "AI Debate"
const DEFAULT_DESCRIPTION =
  "Watch multiple AI language models debate any topic, then rank their agreement. Create public or private debates with models like GPT, Claude, Gemini, and more."

interface SEOProps {
  title?: string
  description?: string
  canonical?: string
  noIndex?: boolean
  ogType?: string
}

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  noIndex = false,
  ogType = "website",
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : SITE_URL

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="theme-color" content="#09090b" />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {!noIndex && <meta name="robots" content="index, follow" />}

      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />

      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  )
}
