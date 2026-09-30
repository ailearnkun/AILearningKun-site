// AI Learn Kun — Form Handler + OAuth + Deploy Webhook
// Endpoints:
//   POST /submit-form   — Contact form submission
//   GET  /auth           — GitHub OAuth login redirect
//   GET  /auth/callback  — GitHub OAuth callback
//   POST /deploy-webhook — GitHub push webhook (redeploy site)
//   GET  /status         — Health check

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3001;
const DEPLOY_SECRET = process.env.DEPLOY_SECRET || "";
const SITE_DIR = process.env.SITE_DIR || "/home/ubuntu/AILearningKun-site";
const WWW_DIR = process.env.WWW_DIR || "/var/www/ailearnkun";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://ailearnkun.my.id";

// OAuth config loaded from oauth-config.json
let oauthConfig = null;
try {
  const raw = await readFile(join(__dirname, "oauth-config.json"), "utf8");
  oauthConfig = JSON.parse(raw);
} catch (err) {
  console.warn("[server] oauth-config.json not found or invalid. OAuth disabled.");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function text(res, status, msg) {
  res.writeHead(status, {
    "Content-Type": "text/plain",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  });
  res.end(msg);
}

function redirect(res, url) {
  res.writeHead(302, { Location: url });
  res.end();
}

async function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

function verifySignature(payload, signature) {
  if (!DEPLOY_SECRET) return true; // no secret configured — accept all
  if (!signature) return false;
  const hmac = createHmac("sha256", DEPLOY_SECRET);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  return signature === digest;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
const server = createServer(async (req, res) => {
  const { method, url } = req;

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature-256",
    });
    res.end();
    return;
  }

  // ── Health check ──────────────────────────────────────────────────────
  if (url === "/status" && method === "GET") {
    json(res, 200, {
      status: "ok",
      uptime: process.uptime(),
      formHandler: true,
      oauth: oauthConfig ? "configured" : "not-configured",
      deploy: !!DEPLOY_SECRET,
    });
    return;
  }

  // ── Form submission ───────────────────────────────────────────────────
  if (url === "/submit-form" && method === "POST") {
    try {
      const body = await readBody(req);
      const data = JSON.parse(body);
      console.log("[form] Submission from", data.name || "unknown");
      json(res, 200, { success: true, message: "Form submitted successfully" });
    } catch (err) {
      console.error("[form] Error:", err.message);
      json(res, 400, { success: false, message: "Invalid form data" });
    }
    return;
  }

  // ── GitHub OAuth ──────────────────────────────────────────────────────
  if (url === "/auth" && method === "GET") {
    if (!oauthConfig) {
      text(res, 500, "OAuth not configured");
      return;
    }
    const state = Math.random().toString(36).substring(2, 15);
    const params = new URLSearchParams({
      client_id: oauthConfig.clientId,
      redirect_uri: oauthConfig.redirectUri,
      scope: "user:email",
      state,
    });
    redirect(res, `https://github.com/login/oauth/authorize?${params}`);
    return;
  }

  if (url.startsWith("/auth/callback") && method === "GET") {
    if (!oauthConfig) {
      text(res, 500, "OAuth not configured");
      return;
    }
    const qs = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const code = qs.get("code");
    const state = qs.get("state");

    if (!code || !state) {
      text(res, 400, "Missing code or state parameter");
      return;
    }

    try {
      // Exchange code for access token
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
          code,
          state,
        }),
      });
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        console.error("[oauth] Token exchange error:", tokenData.error_description);
        text(res, 401, `OAuth failed: ${tokenData.error_description}`);
        return;
      }

      // Redirect back to CMS admin with token
      const redirectUrl = new URL("/admin/", ALLOWED_ORIGIN);
      redirectUrl.searchParams.set("token", tokenData.access_token);
      redirect(res, redirectUrl.toString());
    } catch (err) {
      console.error("[oauth] Error:", err.message);
      text(res, 500, "OAuth error");
    }
    return;
  }

  // ── Deploy webhook ────────────────────────────────────────────────────
  if (url === "/deploy-webhook" && method === "POST") {
    const body = await readBody(req);
    const sig = req.headers["x-hub-signature-256"] || "";

    if (!verifySignature(body, sig)) {
      console.warn("[deploy] Invalid signature");
      text(res, 403, "Invalid signature");
      return;
    }

    try {
      const payload = JSON.parse(body);
      const ref = payload.ref || "";
      const branch = ref.replace("refs/heads/", "");

      if (branch !== "master" && branch !== "main") {
        console.log(`[deploy] Ignoring push to ${branch} (not master)`);
        json(res, 200, { deployed: false, reason: `Branch ${branch} ignored` });
        return;
      }

      console.log("[deploy] Pulling latest changes...");
      execSync("git pull origin master", { cwd: SITE_DIR, timeout: 30000 });

      console.log("[deploy] Building site...");
      execSync("npm run build", {
        cwd: SITE_DIR,
        timeout: 120000,
        env: { ...process.env, NODE_ENV: "production" },
      });

      console.log("[deploy] Deploying to www...");
      execSync(`rsync -a --delete ${SITE_DIR}/dist/ ${WWW_DIR}/`, { timeout: 30000 });

      console.log("[deploy] Done!");
      json(res, 200, { deployed: true, branch });
    } catch (err) {
      console.error("[deploy] Error:", err.message);
      json(res, 500, { deployed: false, error: err.message });
    }
    return;
  }

  // ── 404 ───────────────────────────────────────────────────────────────
  text(res, 404, "Not Found");
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
server.listen(PORT, "127.0.0.1", () => {
  console.log(`[server] Listening on http://127.0.0.1:${PORT}`);
  console.log("[server] OAuth:", oauthConfig ? "GET /auth, GET /auth/callback" : "DISABLED");
  console.log("[server] Deploy webhook: POST /deploy-webhook");
  console.log("[server] Status: GET /status");

  if (!oauthConfig) {
    console.log("[server] *** GitHub OAuth not configured. CMS login will not work.");
  }
  if (!DEPLOY_SECRET) {
    console.log("[server] *** DEPLOY_SECRET not set. Webhook will accept any push.");
  }
});
