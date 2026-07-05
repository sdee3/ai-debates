import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("credits service secret hardening", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
    process.env.IDENTITY_CONVEX_SITE_URL = "https://identity.example"
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("uses the Debates-specific service secret", async () => {
    process.env.CREDITS_SERVICE_SECRET_DEBATES = "debates-secret"

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ledgerEntryId: "entry-1",
          balanceAfter: 1000,
          duplicate: false,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const { debitCreditsForUser } = await import("./credits")
    await debitCreditsForUser({
      clerkUserId: "user_123",
      amount: 200,
      reason: "debates.llm_response",
      idempotencyKey: "key-1",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://identity.example/api/credits/debit",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer debates-secret",
        }),
      }),
    )
  })

  it("throws when the Debates-specific service secret is missing", async () => {
    delete process.env.CREDITS_SERVICE_SECRET_DEBATES

    const { debitCreditsForUser } = await import("./credits")
    await expect(
      debitCreditsForUser({
        clerkUserId: "user_123",
        amount: 200,
        reason: "debates.llm_response",
        idempotencyKey: "key-1",
      }),
    ).rejects.toThrow(/not configured/i)
  })

  it("treats duplicate debits as not charged on this call", async () => {
    process.env.CREDITS_ENFORCEMENT = "true"
    process.env.CREDITS_SERVICE_SECRET_DEBATES = "debates-secret"

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ledgerEntryId: "entry-1",
            balanceAfter: 800,
            duplicate: true,
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
      ),
    )

    const { debitCreditsOrThrow } = await import("./credits")
    const outcome = await debitCreditsOrThrow({
      clerkUserId: "user_123",
      amount: 200,
      reason: "debates.llm_response",
      idempotencyKey: "key-dup",
    })

    expect(outcome.chargedThisCall).toBe(false)
  })
})
