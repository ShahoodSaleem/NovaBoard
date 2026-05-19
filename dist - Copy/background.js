import{t as e}from"./assets/storageService-CYCjIsU6.js";chrome.commands.onCommand.addListener(async e=>{e===`quick-save`&&await t()});async function t(){try{let[t]=await chrome.tabs.query({active:!0,currentWindow:!0});if(!t||!t.url)return;let n=await e.loadData();if(!n||!n.workspaces)return;let r=n.workspaces.find(e=>e.id===n.activeWorkspaceId)||n.workspaces[0],i=r.columns.find(e=>e.name.toLowerCase()===`inbox`)||r.columns[0],a={id:`bm-${Date.now()}`,title:t.title||`New Bookmark`,url:t.url,favicon:t.favIconUrl||``,addedAt:new Date().toISOString()};i.bookmarks.unshift(a),await e.saveData(n),chrome.action.setBadgeText({text:`✓`}),setTimeout(()=>chrome.action.setBadgeText({text:``}),2e3),await chrome.scripting.executeScript({target:{tabId:t.id},func:(e,t)=>{let n=document.getElementById(`flowmarks-toast`);n&&n.remove();let r=document.createElement(`div`);r.id=`flowmarks-toast`,r.style.cssText=`
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
        `,document.body.appendChild(r),requestAnimationFrame(()=>{r.style.right=`24px`}),setTimeout(()=>{r.style.right=`-400px`,setTimeout(()=>r.remove(),500)},3500)},args:[a.title,a.favicon]}),console.log(`Quick Save successful:`,a.title)}catch(e){console.error(`Quick Save failed:`,e)}}