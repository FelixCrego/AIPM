export const isDemoMode =
  process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL;

export const appConfig = {
  name: "DevPilot AI",
  organizationFallbackName: "Demo Organization",
};
