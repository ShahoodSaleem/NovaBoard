var e=`flowmarks_data`,t=[{id:`default-work`,name:`Work`,theme:{backgroundUrl:``,overlayOpacity:0,accentColor:`#3b82f6`},columns:[{id:`col-inbox`,name:`Inbox`,bookmarks:[]},{id:`col-progress`,name:`In Progress`,bookmarks:[]},{id:`col-ready`,name:`Ready`,bookmarks:[]},{id:`col-archive`,name:`Archive`,bookmarks:[]}]}];chrome.commands.onCommand.addListener(async e=>{e===`quick-save`&&await i()});async function n(){return new Promise(t=>{typeof chrome<`u`&&chrome.storage&&chrome.storage.local?chrome.storage.local.get([e],n=>{chrome.runtime.lastError?(console.error(`[FlowMarks BG] Load error:`,chrome.runtime.lastError.message),t(null)):t(n[e]||null)}):t(null)})}async function r(t){return new Promise((n,r)=>{typeof chrome<`u`&&chrome.storage&&chrome.storage.local?chrome.storage.local.set({[e]:t},()=>{chrome.runtime.lastError?(console.error(`[FlowMarks BG] Save error:`,chrome.runtime.lastError.message),r(chrome.runtime.lastError)):n()}):n()})}async function i(){try{let[e]=await chrome.tabs.query({active:!0,currentWindow:!0});if(!e||!e.url)return;let i=await n();(!i||!i.workspaces||i.workspaces.length===0)&&(i={workspaces:t,activeWorkspaceId:t[0].id,isPrivacyMode:!1,isIncognitoMode:!1,bgBlur:0,bgBrightness:100,videoFps:60});let a=i.workspaces.find(e=>e.id===i.activeWorkspaceId)||i.workspaces[0];if(!a)return;a.columns||=[],a.columns.length===0&&a.columns.push({id:`col-inbox-${Date.now()}`,name:`Inbox`,bookmarks:[]});let o=a.columns.find(e=>e.name.toLowerCase()===`inbox`);o||=a.columns[0],o.bookmarks||=[];let s={id:`bm-${Date.now()}`,title:e.title||`New Bookmark`,url:e.url,favicon:e.favIconUrl||``,addedAt:new Date().toISOString()};o.bookmarks.unshift(s),await r(i),chrome.action!==void 0&&chrome.action.setBadgeText&&(chrome.action.setBadgeText({text:`✓`}),chrome.action.setBadgeBackgroundColor&&chrome.action.setBadgeBackgroundColor({color:`#10b981`}),setTimeout(()=>chrome.action.setBadgeText({text:``}),2e3));try{await chrome.scripting.executeScript({target:{tabId:e.id},func:(e,t)=>{let n=document.getElementById(`flowmarks-toast`);n&&n.remove();let r=document.createElement(`div`);r.id=`flowmarks-toast`,r.style.cssText=`
            position: fixed;
            top: 24px;
            right: -400px;
            background: rgba(15, 15, 15, 0.95);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            padding: 16px 20px;
            border-radius: 16px;
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            z-index: 2147483647;
            transition: right 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          `,r.innerHTML=`
            ${t?`<img src="${t}" style="width: 24px; height: 24px; border-radius: 6px;" />`:`<div style="width: 24px; height: 24px; border-radius: 6px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;">📌</div>`}
            <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden; text-align: left;">
              <strong style="font-weight: 600; font-size: 14px; color: #34d399; margin: 0; line-height: 1;">Bookmark Saved</strong>
              <span style="font-size: 13px; color: rgba(255, 255, 255, 0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; line-height: 1;">${e}</span>
            </div>
          `,document.body.appendChild(r),requestAnimationFrame(()=>{r.style.right=`24px`}),setTimeout(()=>{r.style.right=`-400px`,setTimeout(()=>r.remove(),500)},3500)},args:[s.title,s.favicon]})}catch(e){console.log(`Script injection skipped (e.g. system page or activeTab permission not granted):`,e.message)}console.log(`Quick Save successful:`,s.title)}catch(e){console.error(`Quick Save failed:`,e)}}