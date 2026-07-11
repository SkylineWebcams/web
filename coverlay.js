/* SkylineWebcams - custom overlay renderer */
(function(){
  "use strict";

  var _tl=false, _root=null;

  function pad2(x){ x=String(x); return x.length<2?("0"+x):x; }
  function safeUrl(u){ if(!u) return ""; u=String(u).trim(); return /^https?:\/\//i.test(u)?u:""; }
  function clamp(n,min,max){ n=parseFloat(n); if(isNaN(n)) n=min; return Math.min(max,Math.max(min,n)); }
  function hexToRgba(hex,alpha){
    hex=String(hex||"#000000").replace("#","");
    if(hex.length===3) hex=hex.charAt(0)+hex.charAt(0)+hex.charAt(1)+hex.charAt(1)+hex.charAt(2)+hex.charAt(2);
    var r=parseInt(hex.slice(0,2),16)||0, g=parseInt(hex.slice(2,4),16)||0, b=parseInt(hex.slice(4,6),16)||0;
    var a=(alpha==null?100:clamp(alpha,0,100))/100;
    return "rgba("+r+","+g+","+b+","+a+")";
  }

  function partsFor(root){
    var srv=root._cxSrv, tz=root._cxTz;
    if(srv!=null){
      var d=new Date(srv + (Date.now()-(root._cxLoad||Date.now())));
      return {yyyy:String(d.getUTCFullYear()),MM:pad2(d.getUTCMonth()+1),dd:pad2(d.getUTCDate()),HH:pad2(d.getUTCHours()),mm:pad2(d.getUTCMinutes()),ss:pad2(d.getUTCSeconds())};
    }
    if(tz && window.Intl){
      try{
        var pr=new Intl.DateTimeFormat("en-GB",{timeZone:tz,hour12:false,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}).formatToParts(new Date());
        var m={},i; for(i=0;i<pr.length;i++){ m[pr[i].type]=pr[i].value; } if(m.hour==="24") m.hour="00";
        return {yyyy:m.year,MM:m.month,dd:m.day,HH:m.hour,mm:m.minute,ss:m.second};
      }catch(e){}
    }
    var l=new Date();
    return {yyyy:String(l.getFullYear()),MM:pad2(l.getMonth()+1),dd:pad2(l.getDate()),HH:pad2(l.getHours()),mm:pad2(l.getMinutes()),ss:pad2(l.getSeconds())};
  }
  function applyFormat(fmt,p){
    var h24=parseInt(p.HH,10)||0, ap=h24<12?"AM":"PM", h12=h24%12; if(h12===0) h12=12; var hh=pad2(h12);
    return String(fmt)
      .replace(/yyyy/g,p.yyyy).replace(/dd/g,p.dd)
      .replace(/hh/g,hh).replace(/HH/g,p.HH)
      .replace(/mm/g,p.mm).replace(/ss/g,p.ss)
      .replace(/MM/g,p.MM).replace(/A/g,ap);
  }

  function linkWrap(url,child){
    var u=safeUrl(url); if(!u) return child;
    var a=document.createElement("a");
    a.href=u; a.target="_blank"; a.rel="noopener";
    a.style.pointerEvents="auto"; a.style.color="inherit"; a.style.textDecoration="none"; a.style.display="block";
    a.appendChild(child); return a;
  }
  function makeNode(el,root){
    var n=document.createElement("div");
    n.style.position="absolute"; n.style.whiteSpace="nowrap"; n.style.lineHeight="1.15";
    n.style.transform="translate(-50%,-50%)";
    n.style.left=clamp(el.x,0,100)+"%"; n.style.top=clamp(el.y,0,100)+"%";
    var link=(el.type==="datetime")?"":el.link;

    if(el.type==="logo"){
      var img=document.createElement("img");
      img.src=safeUrl(el.src); img.alt="";
      img.style.display="block"; img.style.width="100%"; img.style.height="auto"; img.style.pointerEvents="none";
      n.style.width=clamp(el.w,2,60)+"%";
      n.appendChild(linkWrap(link,img));
    }else{
      if(el.type==="text"){ n.style.whiteSpace="pre-line"; n.style.textAlign="center"; }
      if(el.bg){ n.style.background=hexToRgba(el.bg,el.bgAlpha); n.style.padding=".15em .45em"; n.style.borderRadius="4px"; }
      n.style.color=el.color||"#ffffff"; n.style.fontFamily="Arial,sans-serif";
      n.style.fontWeight=el.bold?"700":"400"; n.style.textShadow="0 1px 2px rgba(0,0,0,.55)";
      n.setAttribute("data-size", el.size||6);
      if(el.type==="datetime"){ n.setAttribute("data-dyn","1"); n.setAttribute("data-fmt", el.format||"HH:mm"); n.textContent=applyFormat(el.format||"HH:mm", partsFor(root)); }
      else n.textContent=String(el.text||"");
      if(el.type==="text" && safeUrl(link)){
        var span=document.createElement("span"); span.textContent=String(el.text||""); n.textContent="";
        n.appendChild(linkWrap(link,span));
      }
    }
    return n;
  }
  function sizeTexts(root){
    var h=root.clientHeight||1, nodes=root.querySelectorAll("[data-size]"), i;
    for(i=0;i<nodes.length;i++){ nodes[i].style.fontSize=Math.max(8,(parseFloat(nodes[i].getAttribute("data-size"))/100)*h)+"px"; }
  }
  function tick(root){
    var nodes=root.querySelectorAll('[data-dyn="1"]'), p=partsFor(root), i;
    for(i=0;i<nodes.length;i++){ nodes[i].textContent=applyFormat(nodes[i].getAttribute("data-fmt"),p); }
  }
  function render(data,root){
    root._cxSrv=(data && data.srvBase!=null)?data.srvBase:null;
    root._cxTz=(data && data.tz)||"";
    root._cxLoad=Date.now();
    while(root.firstChild) root.removeChild(root.firstChild);
    var els=(data && data.elements)||[], noDT=(!!(data && data.noDatetime))||_tl, i, n, el;
    for(i=0;i<els.length;i++){ el=els[i]; if(noDT && el && el.type==="datetime") continue; n=makeNode(el,root); n.setAttribute("data-cx-idx",i); root.appendChild(n); }
    sizeTexts(root);
  }
  function activate(root,data){
    render(data,root);
    _root=root;
    if(root._cxTimer) clearInterval(root._cxTimer);
    root._cxTimer=setInterval(function(){ tick(root); },1000);
    if(!root._cxRO){
      if(window.ResizeObserver){ root._cxRO=new ResizeObserver(function(){ sizeTexts(root); }); root._cxRO.observe(root); }
      else window.addEventListener("resize", function(){ sizeTexts(root); });
    }
  }

  function setTimelapse(on){
    _tl=!!on;
    if(_root){ var nd=_root.querySelectorAll('[data-dyn="1"]'), i; for(i=0;i<nd.length;i++){ nd[i].style.display=on?"none":""; } }
  }

  window.SkylineCustomOverlay={ render:render, activate:activate, setTimelapse:setTimelapse, sizeTexts:sizeTexts, tick:tick, safeUrl:safeUrl, clamp:clamp };

  if(window.Clappr && Clappr.UIContainerPlugin){
    window.CustomOverlay=Clappr.UIContainerPlugin.extend({
      name:"custom_overlay",
      bindEvents:function(){ this.listenTo(this.container, Clappr.Events.CONTAINER_PLAY, this.mount); },
      mount:function(){
        if(this._done) return; this._done=true;
        var cfg=(this.options && this.options.customOverlay) || {elements:[]};
        var el=this.el;
        el.style.position="absolute"; el.style.left="0"; el.style.top="0";
        el.style.width="100%"; el.style.height="100%";
        el.style.pointerEvents="none"; el.style.overflow="hidden"; el.style.zIndex="10";
        this.container.$el.append(this.$el);
        window.SkylineCustomOverlay.activate(el, cfg);
      }
    });
  }
})();
