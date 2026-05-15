import { internalMutation } from "./_generated/server"

export const backfillSlugs = internalMutation({
  handler: async (ctx) => {
    const debates = await ctx.db.query("debates").collect()
    for (const d of debates) {
      if (d.slug) continue
      const slug = `${d.topic.slice(0, 40).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}-${d._id}`
      await ctx.db.patch(d._id, { slug })
    }
  },
})
