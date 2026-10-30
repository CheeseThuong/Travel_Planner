import {test,expect} from "@playwright/test";
const routes=[["/","home"],["/destinations/nha-trang","nha-trang"],["/destinations/da-lat","da-lat"],["/plan/new","workbench"],["/trips/local","trip-shell"],["/privacy","privacy"],["/terms","terms"],["/open","open"],["/shared","shared"]];
const prefix=process.env.TYPOGRAPHY_EVIDENCE_PREFIX??"ATLAS-V2";
const sample="Đường đi đẹp, Nha Trang, Đà Lạt. Dấu hỏi, dấu ngã, chữ ă â ê ô ơ ư và tiếng Việt không bị tách nét.";

test("all Vietnamese headings use installed local faces without broken graphemes",async({page},info)=>{
 const errors=[],remoteFonts=[];
 page.on("pageerror",error=>errors.push(error.message));
 page.on("request",request=>{if(/fonts\.(googleapis|gstatic)\.com/.test(request.url()))remoteFonts.push(request.url())});
 for(const [url,name] of routes){
  await page.goto(url);await page.evaluate(()=>document.fonts.ready);await page.waitForLoadState("networkidle");
  const heading=page.getByRole("heading",{level:1});await expect(heading).toBeVisible();
  expect(await heading.evaluate(node=>getComputedStyle(node).fontFamily)).toMatch(/beVietnam/i);
  expect(await page.locator("body").evaluate(node=>getComputedStyle(node).fontFamily)).toMatch(/beVietnam/i);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width+1);
  const broken=await heading.evaluate(element=>{
   const segmenter=new Intl.Segmenter("vi",{granularity:"grapheme"});
   const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);const failures=[];
   while(walker.nextNode()){
    const node=walker.currentNode;
    for(const {segment,index} of segmenter.segment(node.textContent)){
     if(!segment.trim())continue;
     const range=document.createRange();range.setStart(node,index);range.setEnd(node,index+segment.length);
     const rects=[...range.getClientRects()].filter(rect=>rect.width>0);
     if(new Set(rects.map(rect=>Math.round(rect.top))).size>1)failures.push(segment);
    }
   }
   return failures;
  });
  expect(broken).toEqual([]);
  await page.screenshot({path:`docs/reports/evidence/${prefix}-rendered/${info.project.name}-${name}.png`,fullPage:true,animations:"disabled"});
 }
 expect(remoteFonts).toEqual([]);expect(errors).toEqual([]);
 await page.evaluate(text=>{
  const section=document.createElement("section");section.id="glyph-proof";
  for(const face of ["atlas-proof-body","atlas-proof-accent"])for(const value of [text.normalize("NFC"),text.normalize("NFD")]){
   const p=document.createElement("p");p.className=face;p.textContent=value;p.style.cssText="font-size:32px;line-height:1.5";section.append(p);
  }
  document.querySelector("main").replaceChildren(section);
 },sample);
 await page.evaluate(()=>document.fonts.ready);
 const faces=await page.evaluate(()=>[...document.fonts].map(({family,status,style,weight})=>({family,status,style,weight})));
 expect(faces.filter(f=>f.status==="loaded").some(f=>/nunito/i.test(f.family)&&f.style==="italic")).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width+1);
 await info.attach("font-faces",{body:JSON.stringify(faces),contentType:"application/json"});
});
test("slow local fonts remain readable with bounded layout shift",async({page},info)=>{
 await page.addInitScript(()=>{window.typographyShifts=[];if(PerformanceObserver.supportedEntryTypes.includes("layout-shift"))new PerformanceObserver(list=>{for(const item of list.getEntries())if(!item.hadRecentInput)window.typographyShifts.push(item.value)}).observe({type:"layout-shift",buffered:true})});
 let delayed=0;await page.route(/\.(ttf|woff2?)(\?.*)?$/,async route=>{delayed++;await new Promise(resolve=>setTimeout(resolve,600));await route.continue()});
 await page.goto("/",{waitUntil:"domcontentloaded"});await expect(page.getByRole("heading",{level:1})).toContainText("Đi đâu,");
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);
 expect(delayed).toBeGreaterThan(0);
 const shifts=await page.evaluate(()=>window.typographyShifts);
 expect(shifts.reduce((sum,value)=>sum+value,0)).toBeLessThanOrEqual(0.1);
 await info.attach("font-load-layout-shifts",{body:JSON.stringify({shifts}),contentType:"application/json"});
});
test("failed font requests keep readable text and links",async({page},info)=>{
 await page.route(/\.(ttf|woff2?)(\?.*)?$/,route=>route.abort());await page.goto("/");
 await expect(page.getByRole("heading",{level:1})).toContainText("Đi đâu,");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width+1);
 await page.getByRole("link",{name:/Đà Lạt/}).click();await expect(page.getByRole("heading",{level:1})).toContainText("Đà Lạt");
});
test("without JS Vietnamese and links remain",async({browser},info)=>{
 const context=await browser.newContext({javaScriptEnabled:false,reducedMotion:"reduce",viewport:info.project.use.viewport});
 try{const page=await context.newPage();await page.goto("http://127.0.0.1:3395/");
 await expect(page.getByRole("heading",{level:1})).toContainText("Đi đâu,");
 await expect.poll(()=>page.evaluate(()=>document.fonts.status)).toBe("loaded");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width+1);
 await page.getByRole("link",{name:/Nha Trang/}).click();await expect(page.getByRole("heading",{level:1})).toContainText("Nha Trang");
 }finally{await context.close()}
});
