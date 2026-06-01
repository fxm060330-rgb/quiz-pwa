const { execSync } = require("child_process");
const token = process.env.CF_TOKEN;
if (!token) { console.error("CF_TOKEN not set"); process.exit(1); }
const cmd = `npx wrangler pages deploy out --project-name quiz-pwa --account-id 4b1bba37ad52b97db3fe46d9cb9e538f`;
console.log("Deploying...");
execSync(cmd, { stdio: "inherit", env: { ...process.env, CLOUDFLARE_API_TOKEN: token } });
