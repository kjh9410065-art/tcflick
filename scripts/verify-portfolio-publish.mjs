// Confirm that the separate status page and committed report actually appear on the public site.
import { readFile } from "node:fs/promises";
const base = "https://tcflick.com";
const expected = JSON.parse(await readFile("site-health-status.json", "utf8"));
if (expected.sites?.length !== 6 || !expected.checked_at_utc) throw Error("Local health report is incomplete");
const attempts = 8;
let lastError = "No attempts made";
for (let attempt = 1; attempt <= attempts; attempt++) {
  try {
    const [page, status] = await Promise.all([
      fetch(base + "/site-health.html?probe=" + Date.now(), {cache:"no-store",signal:AbortSignal.timeout(15000)}),
      fetch(base + "/site-health-status.json?probe=" + Date.now(), {cache:"no-store",signal:AbortSignal.timeout(15000)})
    ]);
    const html = page.ok ? await page.text() : "";
    if (page.status !== 200 || !html.includes("SERVICE HEALTH MONITOR") || !html.includes('id="cards"'))
      throw Error("Public standalone dashboard missing: HTTP " + page.status);
    if (status.status !== 200) throw Error("Public health JSON missing: HTTP " + status.status);
    const data = await status.json();
    if (data.sites?.length !== 6) throw Error("Public report does not include all six sites");
    if (Date.parse(data.checked_at_utc) < Date.parse(expected.checked_at_utc))
      throw Error("Public report is older than the latest confirmed audit");
    console.log("Published dashboard and report verified: " + base + "/site-health.html");
    console.log("Six site data published at " + data.checked_at_utc);
    process.exit(0);
  } catch (error) {
    lastError = String(error?.message || error).slice(0,220);
    console.log("Dashboard not yet updated (" + attempt + "/" + attempts + "): " + lastError);
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 12000));
  }
}
throw Error("TCFLiCK status dashboard was not verified on public domain: " + lastError);
