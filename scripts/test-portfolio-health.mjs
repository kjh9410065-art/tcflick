import assert from "node:assert/strict";
import { test } from "node:test";
import { SITES } from "./portfolio-sites.mjs";
import { auditSite, extractCanonical, extractRobotsMeta, scanRobots, scanSitemap, sameCanonical, statusFromIssues } from "./audit-portfolio.mjs";
test("portfolio lists exactly six unique official sites", () => {
  assert.equal(SITES.length, 6);
  assert.equal(new Set(SITES.map(x => x.id)).size, 6);
  assert(SITES.some(x => x.url === "https://nerding.tcflick.com"));
  assert(!SITES.some(x => x.url.includes("mova.tcflick.com")));
});
test("canonical detection respects different HTML attribute orders", () => {
  assert.equal(extractCanonical('<link href="https://site.test/" rel="canonical">'), "https://site.test/");
  assert.equal(extractCanonical("<link rel='canonical' href='https://site.test/'>"), "https://site.test/");
  assert(sameCanonical("https://site.test", "https://site.test/"));
  assert(!sameCanonical("https://wrong.test/", "https://site.test/"));
});
test("robots and sitemap crawler signals", () => {
  assert(scanRobots("User-agent: *\nDisallow: /\nSitemap: https://site.test/sitemap.xml").blocked);
  assert(!scanRobots("User-agent: *\nDisallow: /admin\nSitemap: https://site.test/sitemap.xml").blocked);
  assert(scanRobots("User-agent: *\nAllow: /\nSitemap: https://site.test/sitemap.xml").sitemap_declared);
  assert.equal(scanSitemap("<urlset><url><loc>https://site.test/</loc></url></urlset>").url_count, 1);
  assert.equal(scanSitemap("<html><loc>oops</loc></html>").is_sitemap, false);
  assert.equal(extractRobotsMeta('<meta content="noindex,follow" name="robots">'), "noindex,follow");
});
test("website failures are distinguished from SEO warnings", async () => {
  const target={id:"test",name:"테스트",url:"https://site.test",sample:"/feature"};
  const fake=async(url,options)=> {
    let result={status:200,body:'<html><head><title>Test</title><link rel="canonical" href="https://site.test/"></head></html>',type:"text/html"};
    if(url.endsWith("/robots.txt")) result={status:200,body:"User-agent: *\nAllow: /\nSitemap: https://site.test/sitemap.xml",type:"text/plain"};
    if(url.endsWith("/sitemap.xml")) result={status:200,body:"<urlset><url><loc>https://site.test/</loc></url></urlset>",type:"application/xml"};
    if(options.headers["User-Agent"].includes("Googlebot")) result.status=403;
    return {status:result.status,url,headers:{get:k=>k==="content-type"?result.type:""},text:async()=>result.body};
  };
  const warn=await auditSite(target,fake);
  assert.equal(warn.status,"warning");
  assert.equal(warn.http.homepage,200);
  assert.equal(warn.http.googlebot,403);
  assert(warn.issues.some(x=>x.code==="googlebot_unavailable"));
  assert(!warn.issues.some(x=>x.code==="homepage_unavailable"));
  const down=await auditSite(target,async(u,o)=> {
    const res=await fake(u,o);
    if(u==="https://site.test/" && !o.headers["User-Agent"].includes("Googlebot")) res.status=503;
    return res;
  });
  assert.equal(down.status,"down");
  assert(down.issues.some(x=>x.code==="homepage_unavailable"));
});
test("status precedence: errors, warnings, ok",()=>{
  assert.equal(statusFromIssues([]),"ok");
  assert.equal(statusFromIssues([{level:"warning"}]),"warning");
  assert.equal(statusFromIssues([{level:"warning"},{level:"error"}]),"down");
});

test("independent status page cannot be indexed and clearly marks GSC index as unverified", async () => {
  const {readFile} = await import("node:fs/promises");
  const html = await readFile("site-health.html", "utf8");
  assert.match(html, /noindex,nofollow/);
  assert.match(html, /Search Console.*연동되지 않았으므로|Search Console의 실제 색인/);
  assert.match(html, /id="cards"/);
  for (const width of [320, 390, 690, 1280]) {
    assert(html.includes(String(width)), "missing viewport explanation: " + width);
  }
});
