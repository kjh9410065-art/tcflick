import test from "node:test";
import assert from "node:assert/strict";
import { analyzePage, validateSitemap, validateSourcePages } from "./check-seo-pages.mjs";
const url = "https://tcflick.com/example";
const valid = '<!doctype html><html lang="ko"><head><title>티씨플릭 예시 페이지 | TCFLiCK</title><meta content="티씨플릭 검색 메타데이터를 점검하기 위한 충분한 길이의 독립 설명입니다." name="description"><link href="'+url+'" rel="canonical"><meta name="robots" content="index,follow"></head><body><h1>티씨플릭 예시 페이지</h1></body></html>';
test("metadata parser accepts Korean lang and nonstandard attribute order", () => {
  assert.deepEqual(analyzePage(valid,url).errors, []);
  assert.deepEqual(analyzePage(valid.replace('lang="ko"','lang="ko-KR"'),url).errors, []);
});
test("canonical mismatch and accidental noindex fail", () => {
  const broken=valid.replace(url,"https://another.invalid/").replace("index,follow","noindex,nofollow");
  const errors=analyzePage(broken,url).errors;
  assert.ok(errors.some(item=>item.includes("canonical")));
  assert.ok(errors.some(item=>item.includes("noindex")));
});
test("missing title, missing h1 and retired links fail", () => {
  const broken=valid.replace(/<title>[\s\S]*?<\/title>/,"").replace(/<h1>[\s\S]*?<\/h1>/,"")+"<a href='https://mova.tcflick.com/'>old</a>";
  const errors=analyzePage(broken,url).errors;
  assert.ok(errors.some(item=>item.includes("title")));
  assert.ok(errors.some(item=>item.includes("H1")));
  assert.ok(errors.some(item=>item.includes("NERDING")));
});
test("sitemap rejects duplicate URL and foreign origin", () => {
  assert.throws(()=>validateSitemap("<urlset>"+Array(16).fill("<loc>https://tcflick.com/</loc>").join("")+"</urlset>"),/Duplicate/);
  const urls=Array.from({length:15},(_,i)=>"<loc>https://tcflick.com/page-"+i+"</loc>").join("");
  assert.throws(()=>validateSitemap("<urlset><loc>https://example.com/</loc>"+urls+"</urlset>"),/domain/);
});
test("all published source pages conform", async () => {
  const pages=await validateSourcePages();
  assert.ok(pages.length>=16);
});
