import { convexTest } from "convex-test"
import { afterEach, expect, test } from "vitest"
import { api, internal } from "./_generated/api"
import schema from "./schema"
import type { Id } from "./_generated/dataModel"

interface ImportMetaWithGlob extends ImportMeta {
  glob(pattern: string): Record<string, () => Promise<unknown>>
}

const modules = (import.meta as ImportMetaWithGlob).glob("./**/*.ts")

type ConvexTestInstance = ReturnType<typeof convexTest>

async function seedDebate(
  t: ConvexTestInstance,
  args: {
    userId: string
    topic?: string
    isPublic?: boolean
  },
): Promise<Id<"debates">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("debates", {
      userId: args.userId,
      topic: args.topic ?? "Should AI debate?",
      isPublic: args.isPublic ?? false,
      responses: [
        {
          modelId: "openai/gpt-5.4",
          content: "",
          ranking: 0,
          status: "pending",
        },
      ],
    })
  })
}

test("setDebateResponse updates a single response (internal only)", async () => {
  const t = convexTest(schema, modules)
  const debateId = await seedDebate(t, { userId: "owner_user" })

  await t.mutation(internal.mutations.setDebateResponse, {
    debateId,
    modelId: "openai/gpt-5.4",
    content: "generated",
    ranking: 4,
    status: "completed",
  })

  const debate = await t.query(internal.queries.getDebateForRun, { id: debateId })
  expect(debate?.responses[0]).toEqual({
    modelId: "openai/gpt-5.4",
    content: "generated",
    ranking: 4,
    status: "completed",
  })
})

test("no public mutation exposes response mutation to clients", async () => {
  // Defensive guard: ensures the public API surface never re-adds a
  // client-callable mutation that writes debate responses. The frontend must
  // only ever read debate state — generation is backend-owned.
  const publicMutationNames = Object.keys(
    (api as { mutations: Record<string, unknown> }).mutations,
  )
  expect(publicMutationNames).not.toContain("updateResponses")
  expect(publicMutationNames).not.toContain("setDebateResponse")
})

test("getDebateOwnerId returns the debate owner", async () => {
  const t = convexTest(schema, modules)
  const debateId = await seedDebate(t, { userId: "owner_user" })

  const ownerId = await t.query(internal.lib.debateAuth.getDebateOwnerId, {
    id: debateId,
  })

  expect(ownerId).toBe("owner_user")
})

test("rate limit blocks repeated generateCompletion calls", async () => {
  const t = convexTest(schema, modules)
  const asUser = t.withIdentity({ subject: "rate_limited_user" })

  for (let index = 0; index < 30; index += 1) {
    const result = await t.mutation(internal.lib.rateLimit.checkAndIncrement, {
      key: `generate_completion:rate_limited_user`,
      maxAttempts: 30,
      windowMs: 60 * 60 * 1000,
    })
    expect(result.allowed).toBe(true)
  }

  const blocked = await t.mutation(internal.lib.rateLimit.checkAndIncrement, {
    key: `generate_completion:rate_limited_user`,
    maxAttempts: 30,
    windowMs: 60 * 60 * 1000,
  })
  expect(blocked.allowed).toBe(false)
})

test("audit log accepts only known actions", async () => {
  const t = convexTest(schema, modules)

  await t.mutation(internal.lib.auditLog.writeAuditLog, {
    action: "debate.created",
    userId: "owner_user",
  })

  await expect(
    t.mutation(internal.lib.auditLog.writeAuditLog, {
      action: "custom.spam" as "debate.created",
      userId: "owner_user",
    }),
  ).rejects.toThrow()
})

test("fetchModels requires authentication", async () => {
  const t = convexTest(schema, modules)

  await expect(t.action(api.actions.fetchModels, {})).rejects.toThrow(
    "Not authenticated",
  )
})

test("generateCompletion rejects non-owners for a debate", async () => {
  const t = convexTest(schema, modules)
  const debateId = await seedDebate(t, { userId: "owner_user" })
  const asViewer = t.withIdentity({ subject: "viewer_user" })

  await expect(
    asViewer.action(api.actions.generateCompletion, {
      model: "openai/gpt-5.4",
      messages: [{ role: "user", content: "Topic: test" }],
      debateId,
    }),
  ).rejects.toThrow("Not authorized")
})

afterEach(() => {
  delete process.env.CREDITS_ENFORCEMENT
})
