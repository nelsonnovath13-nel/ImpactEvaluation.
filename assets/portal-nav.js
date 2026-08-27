/* Academic Study Portal — shared navigation layer.
   Reads window.PORTAL_CONFIG, set per page as:
   {
     home: "index.html" | "../index.html",
     subject: {name, url} | null,
     page: {name, url} | null,
     siblings: [{name,url}, ...]   // ordered lecture pages inside the current subject
   }
   Adds nothing to, and removes nothing from, the page's own academic content. */
(function(){
  "use strict";
  var CFG = window.PORTAL_CONFIG || {};
  var HOME_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10v9a1 1 0 0 0 1 1H9.5a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1v-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function onReady(fn){
    if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", fn); }
    else { fn(); }
  }

  function el(tag, attrs, html){
    var e = document.createElement(tag);
    if(attrs){ for(var k in attrs){ if(k === "class"){ e.className = attrs[k]; } else { e.setAttribute(k, attrs[k]); } } }
    if(html !== undefined){ e.innerHTML = html; }
    return e;
  }

  function safeGet(key){ try { return window.localStorage.getItem(key); } catch(e){ return null; } }
  function safeSet(key, val){ try { window.localStorage.setItem(key, val); } catch(e){} }

  onReady(function(){
    var bar = buildBar();
    var progressWrap = buildProgressBar();
    var drawerParts = buildDrawer();

    fixStickyOffsets(bar, progressWrap);
    setupActiveHighlight(drawerParts && drawerParts.links);
    setupProgress(progressWrap);
    buildNextPrev();
    setupContinueReading();
  });

  function crumbList(){
    var list = [];
    if(CFG.subject){ list.push(CFG.subject); }
    if(CFG.page){ list.push(CFG.page); }
    return list;
  }

  function buildBar(){
    var bar = el("div", {id:"pn-bar", role:"navigation", "aria-label":"Portal navigation"});
    var homeLink = el("a", {href: CFG.home || "index.html", class:"pn-home", "aria-label":"Academic Study Portal home"}, HOME_ICON + '<span>Academic Study Portal</span>');
    bar.appendChild(homeLink);

    var crumbs = crumbList();
    if(crumbs.length){
      var wrap = el("div", {id:"pn-crumbs"});
      crumbs.forEach(function(c, i){
        var sep = el("span", {class:"pn-sep", "aria-hidden":"true"}, "›");
        wrap.appendChild(sep);
        var isLast = i === crumbs.length - 1;
        if(isLast){
          wrap.appendChild(el("span", {class:"pn-current", "aria-current":"page"}, escapeHtml(c.name)));
        } else {
          wrap.appendChild(el("a", {href: c.url}, escapeHtml(c.name)));
        }
      });
      bar.appendChild(wrap);
    } else {
      homeLink.setAttribute("aria-current", "page");
    }

    var menuBtn = el("button", {id:"pn-menu-btn", type:"button", "aria-expanded":"false", "aria-controls":"pn-drawer"}, "☰ On this page");
    bar.appendChild(menuBtn);

    document.body.insertBefore(bar, document.body.firstChild);
    return bar;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function isLongPage(){
    return (document.documentElement.scrollHeight - window.innerHeight) > 700;
  }

  function buildProgressBar(){
    if(!isLongPage()) return null;
    var wrap = el("div", {id:"pn-progress", "aria-hidden":"true"});
    var bar = el("div", {id:"pn-progress-bar"});
    wrap.appendChild(bar);
    var afterBar = document.getElementById("pn-bar");
    afterBar.parentNode.insertBefore(wrap, afterBar.nextSibling);
    return {wrap: wrap, bar: bar};
  }

  function collectTocLinks(){
    var nodes = document.querySelectorAll('.sidebar a[href^="#"], .toc a[href^="#"], nav a[href^="#"]');
    var seen = {};
    var out = [];
    nodes.forEach(function(a){
      if(a.closest("#pn-bar, #pn-drawer, #pn-nextprev")) return;
      var href = a.getAttribute("href");
      if(!href || href === "#" || seen[href]) return;
      seen[href] = true;
      out.push(a);
    });
    return out;
  }

  function buildDrawer(){
    var links = collectTocLinks();
    var menuBtn = document.getElementById("pn-menu-btn");
    if(!links.length){
      menuBtn.parentNode.removeChild(menuBtn);
      return null;
    }
    menuBtn.classList.add("pn-has-toc");

    var backdrop = el("div", {id:"pn-backdrop"});
    var drawer = el("nav", {id:"pn-drawer", "aria-label":"Section navigation", "aria-hidden":"true"});
    var head = el("div", {class:"pn-drawer-head"});
    head.appendChild(el("span", {class:"pn-drawer-title"}, "On This Page"));
    var closeBtn = el("button", {class:"pn-close", type:"button", "aria-label":"Close menu"}, "✕");
    head.appendChild(closeBtn);
    drawer.appendChild(head);

    var drawerLinks = [];
    links.forEach(function(a){
      var clone = el("a", {href: a.getAttribute("href")}, a.textContent);
      drawer.appendChild(clone);
      drawerLinks.push(clone);
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    function open(){
      drawer.classList.add("pn-open");
      backdrop.classList.add("pn-open");
      drawer.setAttribute("aria-hidden", "false");
      menuBtn.setAttribute("aria-expanded", "true");
      closeBtn.focus();
    }
    function close(){
      drawer.classList.remove("pn-open");
      backdrop.classList.remove("pn-open");
      drawer.setAttribute("aria-hidden", "true");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.focus();
    }
    menuBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);
    drawer.addEventListener("click", function(e){ if(e.target.tagName === "A"){ close(); } });
    document.addEventListener("keydown", function(e){ if(e.key === "Escape") close(); });

    return {links: links.concat(drawerLinks), sourceLinks: links, mirrorLinks: drawerLinks};
  }

  function fixStickyOffsets(bar, progressWrap){
    var offset = (bar ? bar.offsetHeight : 0) + (progressWrap ? progressWrap.wrap.offsetHeight : 0);
    if(offset <= 0) return;
    var candidates = document.querySelectorAll("header, .top, .topbar, .sidebar, aside, .toc");
    candidates.forEach(function(node){
      if(node.id === "pn-bar" || node.id === "pn-progress" || node.id === "pn-drawer") return;
      var cs = window.getComputedStyle(node);
      if(cs.position === "sticky"){
        var currentTop = parseFloat(cs.top) || 0;
        node.style.top = (currentTop + offset) + "px";
      }
    });
    var anchors = document.querySelectorAll("section[id], article[id], .section[id], h2[id], h3[id]");
    anchors.forEach(function(node){
      node.style.scrollMarginTop = (offset + 16) + "px";
    });
  }

  function setupActiveHighlight(pairedLinks){
    var links = pairedLinks || collectTocLinks();
    if(!links.length || !("IntersectionObserver" in window)) return;

    var byId = {};
    links.forEach(function(a){
      var id = a.getAttribute("href").slice(1);
      if(!id) return;
      if(!byId[id]) byId[id] = [];
      byId[id].push(a);
    });

    var targets = [];
    Object.keys(byId).forEach(function(id){
      var t = document.getElementById(id);
      if(t) targets.push(t);
    });
    if(!targets.length) return;

    function setActive(id){
      links.forEach(function(a){ a.classList.remove("pn-active"); a.removeAttribute("aria-current"); });
      (byId[id] || []).forEach(function(a){ a.classList.add("pn-active"); a.setAttribute("aria-current", "true"); });
    }

    var visible = new Map();
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){ visible.set(entry.target.id, entry.boundingClientRect.top); }
        else { visible.delete(entry.target.id); }
      });
      if(visible.size){
        var topMost = Array.from(visible.entries()).sort(function(a,b){ return Math.abs(a[1]) - Math.abs(b[1]); })[0];
        setActive(topMost[0]);
      }
    }, {rootMargin: "-15% 0px -55% 0px", threshold: [0, 1]});

    targets.forEach(function(t){ observer.observe(t); });
    if(targets[0]) setActive(targets[0].id);
  }

  function setupProgress(progressWrap){
    if(!progressWrap) return;
    var ticking = false;
    function update(){
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
      progressWrap.bar.style.width = pct.toFixed(1) + "%";
      ticking = false;
    }
    update();
    window.addEventListener("scroll", function(){
      if(!ticking){ window.requestAnimationFrame(update); ticking = true; }
    }, {passive: true});
    window.addEventListener("resize", update);
  }

  function buildNextPrev(){
    if(!CFG.page || !CFG.siblings || CFG.siblings.length < 2) {
      if(CFG.subject || CFG.home){ buildBackHomeOnly(); }
      return;
    }
    var here = normalizeUrl(CFG.page.url);
    var idx = -1;
    CFG.siblings.forEach(function(s, i){ if(normalizeUrl(s.url) === here) idx = i; });
    if(idx === -1) return;

    var prev = idx > 0 ? CFG.siblings[idx - 1] : null;
    var next = idx < CFG.siblings.length - 1 ? CFG.siblings[idx + 1] : null;

    var wrap = el("div", {id:"pn-nextprev", "aria-label":"Lecture navigation", role:"navigation"});

    if(CFG.subject){
      var subjectWrap = el("div", {id:"pn-subject-link"});
      subjectWrap.appendChild(el("a", {href: CFG.subject.url}, "↑ Back to " + escapeHtml(CFG.subject.name)));
      wrap.appendChild(subjectWrap);
    }

    if(prev){
      var prevCard = el("a", {class:"pn-nav-card pn-prev", href: prev.url});
      prevCard.appendChild(el("span", {class:"pn-label"}, "← Previous"));
      prevCard.appendChild(el("span", {class:"pn-name"}, escapeHtml(prev.name)));
      wrap.appendChild(prevCard);
    } else {
      wrap.appendChild(el("div", {}, ""));
    }

    if(next){
      var nextCard = el("a", {class:"pn-nav-card pn-next", href: next.url});
      nextCard.appendChild(el("span", {class:"pn-label"}, "Next →"));
      nextCard.appendChild(el("span", {class:"pn-name"}, escapeHtml(next.name)));
      wrap.appendChild(nextCard);
    } else {
      wrap.appendChild(el("div", {}, ""));
    }

    insertBeforeFooter(wrap);
  }

  function buildBackHomeOnly(){
    var wrap = el("div", {id:"pn-backhome"});
    var target = CFG.subject && CFG.subject.url !== currentFile() ? CFG.subject : {name: "Academic Study Portal Home", url: CFG.home};
    var label = target === CFG.subject ? ("← Back to " + target.name) : "← Back to Academic Study Portal";
    wrap.appendChild(el("a", {href: target.url}, escapeHtml(label)));
    insertBeforeFooter(wrap);
  }

  function currentFile(){
    var parts = location.pathname.split("/");
    return parts[parts.length - 1] || "index.html";
  }

  function normalizeUrl(u){
    return u.split("/").pop();
  }

  function insertBeforeFooter(node){
    var footer = document.querySelector("footer, .footer");
    if(footer && footer.parentNode){
      footer.parentNode.insertBefore(node, footer);
    } else {
      document.body.appendChild(node);
    }
  }

  function setupContinueReading(){
    if(!isLongPage()) return;
    var key = "pnpos:" + location.pathname;
    var saveTimer = null;

    function save(){
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      if(max <= 0) return;
      safeSet(key, JSON.stringify({y: window.scrollY, h: doc.scrollHeight, t: Date.now()}));
    }
    window.addEventListener("scroll", function(){
      if(saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 700);
    }, {passive: true});
    window.addEventListener("beforeunload", save);

    var raw = safeGet(key);
    if(!raw) return;
    var saved;
    try { saved = JSON.parse(raw); } catch(e){ return; }
    if(!saved || typeof saved.y !== "number") return;

    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.round((saved.y / max) * 100) : 0;
    var age = Date.now() - (saved.t || 0);
    var sixtyDays = 1000 * 60 * 60 * 24 * 60;

    if(saved.y < 400 || pct >= 96 || age > sixtyDays) return;

    setTimeout(function(){ showContinueToast(saved.y, pct); }, 900);
  }

  function showContinueToast(y, pct){
    var toast = el("div", {id:"pn-toast", role:"status", "aria-live":"polite"});
    toast.appendChild(el("div", {class:"pn-toast-title"}, "Continue reading?"));
    toast.appendChild(el("div", {}, "You were about " + pct + "% through this page."));
    var row = el("div", {class:"pn-toast-row"});
    var resume = el("button", {class:"pn-resume", type:"button"}, "Resume");
    var dismiss = el("button", {class:"pn-dismiss", type:"button"}, "Dismiss");
    row.appendChild(dismiss);
    row.appendChild(resume);
    toast.appendChild(row);
    document.body.appendChild(toast);

    requestAnimationFrame(function(){ toast.classList.add("pn-show"); });

    function hide(){
      toast.classList.remove("pn-show");
      setTimeout(function(){ if(toast.parentNode) toast.parentNode.removeChild(toast); }, 320);
    }
    resume.addEventListener("click", function(){
      window.scrollTo({top: y, behavior: "smooth"});
      hide();
    });
    dismiss.addEventListener("click", hide);
    setTimeout(hide, 14000);
  }
})();
