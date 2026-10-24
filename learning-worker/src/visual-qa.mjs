import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildLessonHtml} from '../../web/lib/lesson-export.mjs';
// Product behavior: test each generated HTML draft; the React viewer receives separate CUA QA.
export async function visualQA(job,{browserType}={}){
  const chromium=browserType||(await import('playwright')).chromium;
  const home=mkdtempSync(join(tmpdir(),'toolbox-visual-'));
  let browser;const checks=[],issues=[];
  try{
    browser=await chromium.launch({headless:true,env:{PATH:process.env.PATH,HOME:home,LANG:'C.UTF-8'},args:['--no-sandbox','--disable-dev-shm-usage']});
    const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
    await context.route('**/*',route=>route.abort());
    const page=await context.newPage();page.setDefaultTimeout(10000);
    page.on('pageerror',()=>{if(!issues.includes('Draft has a browser script error.'))issues.push('Draft has a browser script error.');});
    const html=buildLessonHtml({...job,status:'ready'});
    for(const width of [320,390,1100]){
      await page.setViewportSize({width,height:900});await page.setContent(html,{waitUntil:'load'});
      if(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth))issues.push(`Draft overflows horizontally at ${width}px.`);
      if(await page.locator('button,select').evaluateAll(els=>els.some(el=>{const b=el.getBoundingClientRect();return b.width>0&&b.height>0&&b.height<43;})))issues.push(`Draft has a small control at ${width}px.`);
      for(let i=0;i<job.lesson.sections.length;i++){
        const section=job.lesson.sections[i],el=page.locator('[data-section]').nth(i);
        for(let j=0;j<section.nodes.length;j++){
          await el.locator('[data-step]').nth(j).click();
          if(await el.locator('.detail').textContent()!==section.nodes[j].detail)issues.push(`Chapter ${i+1}: step detail does not match selected node.`);
        }
        if(section.scenario){
          for(let j=0;j<section.scenario.options.length;j++){
            const option=section.scenario.options[j];await el.locator('[data-scenario]').selectOption(String(j));
            if(await el.locator('.result').textContent()!==option.result)issues.push(`Chapter ${i+1}: scenario result is incorrect.`);
            if(await el.locator('[data-step]:visible').count()!==new Set(option.path).size)issues.push(`Chapter ${i+1}: scenario path is incorrect.`);
          }
          await el.locator('[data-scenario]').selectOption('-1');
        }
      }
      checks.push(`Browser ${width}px: overflow, touch height, all diagram steps and scenarios exercised.`);
    }
    await context.close();return {checks,issues:[...new Set(issues)]};
  }finally{if(browser)await browser.close();rmSync(home,{recursive:true,force:true});}
}
