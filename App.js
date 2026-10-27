var BASE=(window.FLOWPAY_API||"").replace(/\/$/,"");
var NAV=["Overview","Checkout","Payments","Refunds","Settlements","Ledger","Webhooks"],tab="Overview",me=null;
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}}
var KEY=ls("fp_key")||"",mem={};
function rid(){var s="",c="abcdefghijklmnopqrstuvwxyz0123456789";for(var i=0;i<24;i++)s+=c[Math.floor(Math.random()*36)];return s}
function $(i){return document.getElementById(i)}
function rs(n){return "₹"+(n/100).toLocaleString("en-IN",{minimumFractionDigits:2})}
function dt(s){return s?new Date(s).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):"—"}
function toast(m){var t=$("t");t.textContent=m;t.style.display="block";clearTimeout(toast.h);toast.h=setTimeout(function(){t.style.display="none"},3500)}
async function call(m,p,body,hd){
  var h={"Content-Type":"application/json"};if(KEY)h["X-Api-Key"]=KEY;for(var k in(hd||{}))h[k]=hd[k];
  var r=await fetch(BASE+p,{method:m,headers:h,body:body?JSON.stringify(body):undefined}),j=null;
  try{j=await r.json()}catch(e){}
  if(!r.ok)throw new Error((j&&j.message)||("Request failed ("+r.status+")"));return j}
function tbl(cols,rows){if(!rows.length)return "<div class='mu' style='padding:16px 0'>Nothing here yet.</div>";
  return "<div class='tw'><table><thead><tr>"+cols.map(function(c){return "<th>"+c[0]+"</th>"}).join("")+"</tr></thead><tbody>"+rows.map(function(r){return "<tr>"+cols.map(function(c){return "<td>"+c[1](r)+"</td>"}).join("")+"</tr>"}).join("")+"</tbody></table></div>"}
function pill(s){return "<span class='pill "+s+"'>"+s+"</span>"}
function go(t){tab=t;render()}
async function render(){
  var v=$("v");
  if(KEY&&!me){try{me=await call("GET","/api/merchants/me")}catch(e){KEY="";ls("fp_key",null);toast(e.message)}}
  if(!me){$("nav").innerHTML="";$("who").textContent="";
    v.innerHTML="<div class='g'><div class='p'><h2>Create merchant account</h2><label>Business name</label><input id='rn'><label>Email</label><input id='re' type='email'><button class='b' onclick='reg()'>Create account</button><div id='rk'></div></div><div class='p'><h2>Sign in with API key</h2><label>API key</label><input id='ik' placeholder='fp_test_…'><button class='b' onclick='login()'>Sign in</button></div></div>";return}
  $("who").innerHTML=me.name+" · <a href='#' onclick='out()' style='color:var(--ac)'>Sign out</a>";
  $("nav").innerHTML=NAV.map(function(n){return "<button class='"+(n==tab?"on":"")+"' onclick='go(\""+n+"\")'>"+n+"</button>"}).join("");
  v.innerHTML="<div class='mu'>Loading…</div>";
  try{v.innerHTML=await views[tab]()}catch(e){v.innerHTML="<div class='p'>"+e.message+"</div>"}}
function out(){KEY="";me=null;ls("fp_key",null);render()}
async function reg(){try{var r=await call("POST","/api/merchants",{name:$("rn").value.trim(),email:$("re").value.trim()});
  var k=r.apikey||r.apiKey;ls("fp_key",k);KEY=k;
  $("rk").innerHTML="<p>Account created. Save these now, they are shown once:</p><p>API key <code>"+k+"</code></p><p>Webhook secret <code>"+r.webhookSecret+"</code></p><button class='b' onclick='render()'>Continue</button>"}catch(e){toast(e.message)}}
async function login(){KEY=$("ik").value.trim();me=null;ls("fp_key",KEY);render()}
var views={
 Overview:async function(){me=await call("GET","/api/merchants/me");var p=await call("GET","/api/transactions");
  var ok=p.filter(function(x){return x.status=="SUCCESS"});var gross=ok.reduce(function(a,x){return a+x.amount},0);
  return "<div class='g'><div class='p'><div class='mu'>Available balance</div><div class='big'>"+rs(me.balance)+"</div></div><div class='p'><div class='mu'>Successful payments</div><div class='big'>"+ok.length+"</div></div><div class='p'><div class='mu'>Gross volume</div><div class='big'>"+rs(gross)+"</div></div></div><div class='p'><h2>Recent payments</h2>"+tbl(PC,p.slice(0,6))+"</div>"},
 Checkout:async function(){return "<div class='p' style='max-width:420px'><h2>Test checkout</h2><label>Amount (₹)</label><input id='am' type='number' min='1' step='0.01' value='499'><button class='b' onclick='openCk()'>Pay with Flowpay</button><p class='mu'>Creates an order, then opens the Flowpay payment window.</p></div>"},
 Payments:async function(){var s=mem.f||"";var p=await call("GET","/api/transactions"+(s?"?status="+s:""));
  return "<div class='p'><h2>Payments</h2><select onchange='mem.f=this.value;render()' style='max-width:200px'>"+["","SUCCESS","PENDING","FAILED","CREATED"].map(function(x){return "<option value='"+x+"'"+(x==s?" selected":"")+">"+(x||"All statuses")+"</option>"}).join("")+"</select>"+tbl(PC.concat([["",function(x){return x.status=="SUCCESS"&&x.amount>x.refunded?"<button class='b l' onclick='refund(\""+x.id+"\","+(x.amount-x.refunded)+")'>Refund</button>":x.status=="PENDING"?"<button class='b l' onclick='chk(\""+x.id+"\")'>Check</button>":""}]]),p)+"</div>"},
 Refunds:async function(){var r=await call("GET","/api/refunds");return "<div class='p'><h2>Refunds</h2>"+tbl([["Refund",function(x){return x.id}],["Payment",function(x){return x.paymentId}],["Amount",function(x){return rs(x.amount)}],["Status",function(x){return pill(x.status)}],["Date",function(x){return dt(x.createdAt)}]],r)+"</div>"},
 Settlements:async function(){var r=await call("GET","/api/settlements");return "<div class='p'><h2>Settlements</h2><p class='mu'>Balance available: "+rs(me.balance)+"</p><button class='b' onclick='settle()'>Settle balance</button>"+tbl([["Settlement",function(x){return x.id}],["Amount",function(x){return rs(x.amount)}],["Status",function(x){return pill(x.status)}],["Date",function(x){return dt(x.createdAt)}]],r)+"</div>"},
 Ledger:async function(){var r=await call("GET","/api/transactions/leger");return "<div class='p'><h2>Ledger</h2>"+tbl([["Entry",function(x){return x.id}],["Type",function(x){return x.type}],["Reference",function(x){return x.referenceId}],["Amount",function(x){return rs(x.amount)}],["Balance after",function(x){return rs(x.balanceAfter)}],["Date",function(x){return dt(x.createdAt)}]],r)+"</div>"},
 Webhooks:async function(){var r=await call("GET","/api/webhooks");return "<div class='p'><h2>Webhook deliveries</h2>"+tbl([["Event",function(x){return x.eventId}],["Status",function(x){return pill(x.status)}],["Attempts",function(x){return x.attempts}],["Last error",function(x){return x.lastError||"—"}],["",function(x){return x.status!="DELIVERED"&&x.status!="SENT"?"<button class='b l' onclick='retry(\""+x.id+"\")'>Retry</button>":""}]],r)+"</div>"}};
var PC=[["Payment",function(x){return x.id}],["Method",function(x){return x.method}],["Amount",function(x){return rs(x.amount)}],["Fee",function(x){return rs(x.fee)}],["Status",function(x){return pill(x.status)}],["Date",function(x){return dt(x.createdAt)}]];
async function refund(id,max){var a=prompt("Refund amount in ₹ (max "+(max/100)+")",max/100);if(!a)return;
  try{await call("POST","/api/refunds",{paymentId:id,amount:Math.round(parseFloat(a)*100)},{"Idempotency-Key":rid()});toast("Refund created");me=null;render()}catch(e){toast(e.message)}}
async function chk(id){try{var p=await call("POST","/api/payments/"+id+"/check");toast("Status: "+p.status);render()}catch(e){toast(e.message)}}
async function settle(){try{await call("POST","/api/settlements",null,{"Idempotency-Key":rid()});toast("Settlement created");me=null;render()}catch(e){toast(e.message)}}
async function retry(id){try{await call("POST","/api/webhooks/"+id+"/retry");toast("Retry queued");render()}catch(e){toast(e.message)}}
/* ---- Checkout window ---- */
var ord=null,meth="UPI",ik="",pk={};
async function openCk(){var amt=Math.round(parseFloat($("am").value)*100);if(!(amt>=100)){toast("Minimum amount is ₹1");return}
  $("ov").classList.add("on");$("mn").innerHTML="<div class='st'><div class='ic sp'></div>Creating order…</div>";
  try{ord=await call("POST","/api/orders",{amount:amt,receipt:"rcpt_"+rid().slice(0,10)})}catch(e){$("mn").innerHTML="<div class='st'>"+e.message+"<br><br><button class='b' onclick='shut()'>Close</button></div>";return}
  meth="UPI";pk={};ik=rid();$("sa").textContent=rs(ord.amount);$("so").textContent=ord.id;form()}
function shut(){$("ov").classList.remove("on")}
function form(){var h="<div class='tabs'>"+["UPI","CARD","NETBANKING","WALLET"].map(function(m){return "<button class='tab"+(m==meth?" on":"")+"' onclick='meth=\""+m+"\";form()'>"+m+"</button>"}).join("")+"</div>";
  if(meth=="UPI")h+="<label>UPI ID</label><input placeholder='name@bank'>";
  if(meth=="CARD")h+="<label>Card number</label><input placeholder='4111 1111 1111 1111'><label>Expiry</label><input placeholder='MM/YY'><label>CVV</label><input type='password' placeholder='•••'>";
  if(meth=="NETBANKING"||meth=="WALLET"){h+="<label>"+(meth=="WALLET"?"Wallet":"Bank")+"</label><div style='display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px'>"+(meth=="WALLET"?["Paytm","PhonePe","Amazon Pay"]:["SBI","HDFC","ICICI","Axis"]).map(function(b){return "<button class='o"+(pk[meth]==b?" on":"")+"' onclick='pk[meth]=\""+b+"\";form()'>"+b+"</button>"}).join("")+"</div>"}
  h+="<label>Simulate bank result</label><select id='sc'><option value='SUCCESS'>Success</option><option value='FAILURE'>Failure</option><option value='DELAYED_SUCCESS'>Delayed success (about 8 sec)</option><option value='TIMEOUT'>Timeout (about 20 sec)</option></select><button class='b' style='width:100%' onclick='pay()'>Pay "+rs(ord.amount)+"</button>";
  $("mn").innerHTML=h}
function fin(ok,t,m,retry){$("mn").innerHTML="<div class='st'><div class='ic' style='background:var("+(ok?"--ok":"--bad")+")'>"+(ok?"✓":"!")+"</div><h2>"+t+"</h2><div class='mu'>"+m+"</div><br><button class='b' onclick='"+(retry?"openCk()":"shut();go(\"Payments\")")+"'>"+(retry?"Try again":"Done")+"</button></div>"}
async function pay(){var sc=$("sc").value;$("mn").innerHTML="<div class='st'><div class='ic sp'></div><b>Processing payment</b><br><span class='mu'>Please don’t close this window.</span></div>";
  try{var p=await call("POST","/api/payments",{orderId:ord.id,method:meth,scenario:sc},{"Idempotency-Key":ik});
    p=await call("POST","/api/payments/"+p.id+"/process");
    for(var i=0;i<30&&p.status=="PENDING";i++){await new Promise(function(r){setTimeout(r,2000)});p=await call("POST","/api/payments/"+p.id+"/check")}
    me=null;
    if(p.status=="SUCCESS")fin(true,"Payment successful",rs(p.amount)+" paid via "+meth+"<br>Payment ID: "+p.id);
    else if(p.status=="FAILED")fin(false,"Payment failed","The bank declined this payment. No money was taken.",true);
    else fin(false,"Still pending","The bank has not confirmed yet. Check the payment later from the Payments page.")}
  catch(e){fin(false,"Could not complete payment",e.message,true)}}
document.addEventListener("keydown",function(e){if(e.key=="Escape")shut()});
render();