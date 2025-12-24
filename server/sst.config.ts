/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "debates",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "us-east-1",
          profile: "default",
        },
      },
    }
  },
  async run() {
    const vpc = new sst.aws.Vpc("Vpc")
    const cluster = new sst.aws.Cluster("Cluster", { vpc })
    const openRouterApiKey = new sst.Secret("OpenRouterApiKey")
    const platformPassword = new sst.Secret("PlatformPassword")

    new sst.aws.Service("AIDebatesService", {
      cluster,
      loadBalancer: {
        ports: [{ listen: "80/http", forward: "3000/http" }],
      },
      dev: {
        command: "pnpm dev",
      },
      image: {
        context: "./",
        dockerfile: "Dockerfile",
      },
      environment: {
        OPENROUTER_API_KEY: openRouterApiKey.value,
        PLATFORM_PASSWORD: platformPassword.value,
      },
    })
  },
})
