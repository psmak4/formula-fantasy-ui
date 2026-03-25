import { spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const previewHost = "127.0.0.1";
const previewPort = Number(process.env.SMOKE_PREVIEW_PORT ?? "4173");
const uiBaseUrl = `http://${previewHost}:${previewPort}`;
const apiBaseUrl = process.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4010";
const debugUserId = "11111111-1111-4111-8111-111111111111";

const nextRace = {
  raceId: "24",
  seasonYear: 2026,
  round: 3,
  name: "Japanese Grand Prix",
  raceStartAt: "2026-03-29T05:00:00.000Z",
  status: "scheduled",
  openAt: "2026-03-22T05:00:00.000Z",
  lockAt: "2026-03-29T04:50:00.000Z",
  entryOpensAt: "2026-03-22T05:00:00.000Z",
  entryClosesAt: "2026-03-29T04:50:00.000Z",
  predictionOpensAt: "2026-03-22T05:00:00.000Z",
  predictionClosesAt: "2026-03-29T04:50:00.000Z",
  entriesOpen: true,
  entriesLocked: false,
  predictionLocked: false,
  lockStatus: "open",
  windowStatus: "open",
  timeUntilOpenMs: 0,
  timeUntilLockMs: 3600000,
};

const drivers = [
  { id: "1", givenName: "Max", familyName: "Verstappen", code: "VER", number: "1", constructorName: "Red Bull" },
  { id: "2", givenName: "Lando", familyName: "Norris", code: "NOR", number: "4", constructorName: "McLaren" },
  { id: "3", givenName: "Charles", familyName: "Leclerc", code: "LEC", number: "16", constructorName: "Ferrari" },
  { id: "4", givenName: "Lewis", familyName: "Hamilton", code: "HAM", number: "44", constructorName: "Ferrari" },
  { id: "5", givenName: "George", familyName: "Russell", code: "RUS", number: "63", constructorName: "Mercedes" },
];

let savedEntry = null;

async function main() {
  const preview = spawn(
    "pnpm",
    ["exec", "vite", "preview", "--host", previewHost, "--port", String(previewPort), "--strictPort"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CI: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let previewOutput = "";
  preview.stdout.on("data", (chunk) => {
    previewOutput += chunk.toString();
  });
  preview.stderr.on("data", (chunk) => {
    previewOutput += chunk.toString();
  });

  try {
    await waitForPreview(preview);

    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext();
      await context.route(`${apiBaseUrl}/**`, async (route) => {
        const request = route.request();
        const url = new URL(request.url());

        if (url.pathname.startsWith("/api/auth/")) {
          await fulfillJson(route, 200, {
            session: {
              id: "session-1",
              userId: debugUserId,
              expiresAt: "2099-01-01T00:00:00.000Z",
            },
            user: {
              id: debugUserId,
              email: "smoke@example.com",
              name: "Smoke Driver",
              image: null,
            },
          });
          return;
        }

        if (request.method() === "GET" && url.pathname === "/me/leagues") {
          await fulfillJson(route, 200, {
            leagues: [
              {
                id: "league-1",
                name: "Smoke Test League",
                memberCount: 1,
                visibility: "private",
                rank: 1,
                createdAt: "2026-03-24T00:00:00.000Z",
              },
            ],
          });
          return;
        }

        if (request.method() === "GET" && url.pathname === "/me") {
          await fulfillJson(route, 200, {
            userId: debugUserId,
            id: debugUserId,
            email: "smoke@example.com",
            displayName: "Smoke Driver",
          });
          return;
        }

        if (request.method() === "POST" && url.pathname === "/leagues") {
          await fulfillJson(route, 200, { id: "league-1" });
          return;
        }

        if (request.method() === "GET" && url.pathname === "/leagues/league-1") {
          await fulfillJson(route, 200, {
            id: "league-1",
            name: "Smoke Test League",
            visibility: "private",
            members: [
              {
                userId: debugUserId,
                displayName: "Smoke Driver",
                role: "owner",
              },
            ],
          });
          return;
        }

        if (request.method() === "GET" && url.pathname === "/leagues/league-1/standings") {
          await fulfillJson(route, 200, {
            scoringAvailable: false,
            seasonYear: 2026,
            rows: [],
          });
          return;
        }

        if (request.method() === "POST" && url.pathname === "/leagues/league-1/invites") {
          await fulfillJson(route, 200, {
            token: "invite-token",
            inviteUrl: `${uiBaseUrl}/invite/invite-token`,
          });
          return;
        }

        if (request.method() === "GET" && url.pathname === "/f1/next-race") {
          await fulfillJson(route, 200, nextRace);
          return;
        }

        if (request.method() === "GET" && url.pathname === "/f1/next-race/drivers") {
          await fulfillJson(route, 200, drivers);
          return;
        }

        if (url.pathname === "/leagues/league-1/races/next/entry/me") {
          if (request.method() === "GET") {
            await fulfillJson(route, 200, {
              raceId: nextRace.raceId,
              raceStartAt: nextRace.raceStartAt,
              window: {
                openAt: nextRace.openAt,
                lockAt: nextRace.lockAt,
                isLocked: false,
              },
              picks: savedEntry?.picks,
            });
            return;
          }

          if (request.method() === "PUT") {
            savedEntry = request.postDataJSON();
            await fulfillJson(route, 200, {
              ok: true,
            });
            return;
          }
        }

        await route.abort();
      });

      const page = await context.newPage();
      try {
        await page.goto(`${uiBaseUrl}/leagues/create`, { waitUntil: "networkidle" });

        await expectVisible(page, "Create League");
        await page.locator("#leagueName").fill("Smoke Test League");
        await page.getByRole("button", { name: "Create League", exact: true }).click();

        await page.waitForURL(`${uiBaseUrl}/league/league-1`);
        await expectVisible(page, "Smoke Test League");
        await expectVisible(page, "Awaiting Scoring");
        await page.getByRole("link", { name: "Edit Predictions" }).click();

        await page.waitForURL(`${uiBaseUrl}/league/league-1/predict`);
        await expectVisible(page, "Race Weekend Calls");
        await expectVisible(page, "Validation");

        await selectDriver(page, "P1 Winner", "Max Verstappen");
        await selectDriver(page, "P2", "Lando Norris");
        await selectDriver(page, "P3", "Charles Leclerc");
        await selectDriver(page, "Fastest Lap", "Lewis Hamilton");
        await selectDriver(page, "Biggest Gainer", "George Russell");
        await selectClassifiedFinishers(page, "16 to 20 finishers");
        await page.getByLabel("Safety car deployed").check();

        await page.getByRole("button", { name: "Save Entry" }).click();
        await expectVisible(page, "Entry saved");

        if (!savedEntry?.picks) {
          throw new Error("Smoke test did not capture a saved entry payload");
        }
      } catch (error) {
        console.error("Smoke state url:", page.url());
        console.error("Smoke state text:", await page.locator("body").innerText());
        throw error;
      }
    } finally {
      await browser.close();
    }
  } finally {
    preview.kill("SIGTERM");
    await waitForExit(preview);
    if (preview.exitCode && preview.exitCode !== 0) {
      console.error(previewOutput);
    }
  }
}

async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function waitForPreview(preview) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30000) {
    if (preview.exitCode !== null) {
      throw new Error(`vite preview exited early with code ${preview.exitCode}`);
    }

    try {
      const response = await fetch(uiBaseUrl);
      if (response.ok) {
        return;
      }
    } catch {}

    await delay(250);
  }

  throw new Error("Timed out waiting for vite preview");
}

async function expectVisible(page, text) {
  await page.getByText(text).first().waitFor({ state: "visible", timeout: 10000 });
}

async function selectDriver(page, label, optionText) {
  await page.getByLabel(label).click();
  await page.getByRole("option", { name: new RegExp(optionText, "i") }).click();
}

async function selectClassifiedFinishers(page, optionText) {
  await page.getByLabel("Classified Finishers").click();
  await page.getByRole("option", { name: new RegExp(optionText, "i") }).click();
}

async function waitForExit(child) {
  if (child.exitCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    child.once("exit", resolve);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
