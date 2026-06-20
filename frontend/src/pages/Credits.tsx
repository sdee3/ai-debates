import { SEO } from "../components/SEO"
import { BuyCreditsPage } from "../components/BuyCreditsPage"

export default function Credits() {
  return (
    <>
      <SEO
        title="Credits"
        description="View your SDEE3 credits balance, purchase more, and see transaction history for AI Debates."
        canonical="/credits"
      />
      <BuyCreditsPage />
    </>
  )
}
