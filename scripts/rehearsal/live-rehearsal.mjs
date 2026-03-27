import { chromium } from "playwright";

const baseUrl = process.env.REHEARSAL_BASE_URL ?? "http://127.0.0.1:5173";
const email = `mvp.rehearsal.${Date.now()}@example.com`;
const password = "FormulaFantasy!2026";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    logStep(`Sign up as ${email}`);
    await page.goto(`${baseUrl}/sign-up`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.fill("#signUpEmail", email);
    await page.fill("#signUpPassword", password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL((url) => !url.toString().includes("/sign-up"), { timeout: 30000 });

    logStep("Open create-league flow");
    await page.goto(`${baseUrl}/leagues/create`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.fill("#leagueName", "MVP Rehearsal League");
    await page.getByRole("button", { name: "Create League", exact: true }).click();
    await page.waitForURL(/\/league\//, { timeout: 30000 });
    console.log(`leagueUrl=${page.url()}`);

    logStep("Open prediction card");
    await page.getByRole("link", { name: "Open Prediction Card", exact: true }).click();
    await page.waitForURL(/\/predict$/, { timeout: 30000 });

    logStep("Populate prediction card");
    await selectOption(page, "P1 Winner", "Verstappen");
    await selectOption(page, "P2", "Norris");
    await selectOption(page, "P3", "Leclerc");
    await selectOption(page, "Fastest Lap", "Hamilton");
    await selectOption(page, "Biggest Gainer", "Russell");
    await selectOption(page, "Classified Finishers", "16 to 20 finishers");
    await page.getByLabel("Safety car deployed").check();

    logStep("Save prediction card");
    await page.getByRole("button", { name: "Save Entry" }).click();
    await page.getByText("Entry saved").waitFor({ state: "visible", timeout: 30000 });

    console.log(`email=${email}`);
    console.log(`password=${password}`);
    console.log("result=success");
  } catch (error) {
    console.error("result=failure");
    console.error(error instanceof Error ? error.stack : String(error));
    console.error(`finalUrl=${page.url()}`);
    console.error(`bodyText=${await page.locator("body").innerText()}`);
    await page.screenshot({ path: "rehearsal-failure.png", fullPage: true });
    console.error("screenshot=rehearsal-failure.png");
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

async function selectOption(page, label, optionText) {
  await page.getByLabel(label).click();
  await page.getByRole("option", { name: new RegExp(optionText, "i") }).click();
}

function logStep(step) {
  console.log(`step=${step}`);
}

main();
