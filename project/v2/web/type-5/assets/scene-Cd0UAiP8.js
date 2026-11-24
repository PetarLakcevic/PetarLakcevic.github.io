var e=`INICIJATIVA  HRABROST  UZAJAMNOST  `,t=[...new Set(e.replace(/ /g,``))],n=256,r=4,i=[[.62,.082],[.86,.1],[1.16,.128],[1.52,.158],[1.96,.196],[2.5,.24],[3.15,.3]],a=(e,t,n)=>{let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)},o=(e,t,n)=>e+(t-e)*n;function s(e,t){for(let n=0;n<e.length-1;n++){let[r,i]=e[n],[s,c]=e[n+1];if(t<=s)return o(i,c,a(r,s,t))}return e[e.length-1][1]}function c(e,t,n,r){let i=1/Math.tan(e*Math.PI/360),a=1/(n-r);return[i/t,0,0,0,0,i,0,0,0,0,(r+n)*a,-1,0,0,2*r*n*a,0]}var l=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],u=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],d=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],f=e=>{let t=Math.hypot(...e)||1;return[e[0]/t,e[1]/t,e[2]/t]};function p(e,t,n){let r=f(l(e,t)),i=f(u(n,r)),a=u(r,i);return{m:[i[0],a[0],r[0],0,i[1],a[1],r[1],0,i[2],a[2],r[2],0,-d(i,e),-d(a,e),-d(r,e),1],right:i,up:a}}function m(e,t){let n=new Float32Array(16);for(let r=0;r<4;r++)for(let i=0;i<4;i++)n[r*4+i]=e[i]*t[r*4]+e[i+4]*t[r*4+1]+e[i+8]*t[r*4+2]+e[i+12]*t[r*4+3];return n}var h=`#version 300 es
in vec2 a; in float h;
uniform mat4 uVP; uniform float uE;
out float vR; out float vH; out vec2 vP;
void main(){ vR=length(a); vH=h; vP=a; gl_Position=uVP*vec4(a.x,h*.001*uE,a.y,1.); }`,g=`#version 300 es
precision highp float; in float vR,vH; in vec2 vP; uniform float uHeat,uW,uT,uLake; out vec4 o;
void main(){
  vec3 c=vec3(.039,.031,.024)+vec3(.2,.035,.008)*exp(-vR*vR/.8)*(.22+uHeat*.34);
  if(vR<.5){
    float a=atan(vP.y,vP.x);
    float w=vR+.012*sin(a*5.+uT*.5)+.009*sin(a*11.-uT*.4);
    float k=floor((1.-w/.55)*6.+uT*.25);
    vec3 l=mix(vec3(.91,.26,.05),vec3(1.,.5,.14),fract(k*.5));
    l=mix(l,vec3(1.,.8,.42),smoothstep(.34,.08,vR));
    c=mix(c,l,smoothstep(uLake+7.,uLake+2.,vH));
  }
  c=mix(c,vec3(.96,.941,.922),smoothstep(uW,uW*.72,vR));
  o=vec4(c,1.);
}`,_=`#version 300 es
in vec2 c; in vec4 seg; in float lev;
uniform mat4 uVP; uniform vec2 uRes; uniform float uE,uDpr,uGrow;
out float vS; out float vW; out float vL; out float vR;
void main(){
  float y=lev*.001*uE;
  vec4 a=uVP*vec4(seg.x,y,seg.y,1.), b=uVP*vec4(seg.z,y,seg.w,1.);
  vec2 d=(b.xy/max(b.w,.01)-a.xy/max(a.w,.01))*uRes;
  vec2 n=vec2(-d.y,d.x)/max(length(d),1e-4);
  bool idx=mod(lev+.5,100.)<1.;
  float hw=(idx?1.05:.58)*uDpr*uGrow+.75;
  vec4 p=mix(a,b,c.x);
  p.xy+=n*c.y*hw*2./uRes*p.w;
  p.z-=.00045*p.w;
  gl_Position=p;
  vS=c.y*hw; vW=hw; vL=lev; vR=length(mix(seg.xy,seg.zw,c.x));
}`,v=`#version 300 es
precision highp float;
in float vS,vW,vL,vR; uniform float uT,uReveal,uW; out vec4 o;
void main(){
  float e=smoothstep(vW,vW-1.,abs(vS));
  float t=clamp(vL/1250.,0.,1.);
  vec3 c=mix(vec3(.46,.33,.22),vec3(.725,.53,.34),smoothstep(0.,.45,t));
  c=mix(c,vec3(.91,.26,.05),smoothstep(.5,.85,t));
  c=mix(c,vec3(1.,.72,.3),smoothstep(.86,.98,t));
  bool idx=mod(vL+.5,100.)<1.;
  float a=idx?1.:.58;
  // A pulse of heat runs down the mountain, line by line.
  float pulse=pow(.5+.5*sin(vL*.022+uT*1.5),10.);
  c=mix(c,vec3(1.,.66,.28),pulse*.75);
  a*=smoothstep(5.4,3.9,vR)*(.5+.5*smoothstep(-.1,.28,t));
  a*=smoothstep(uReveal,uReveal-90.,vL);
  a*=smoothstep(uW*.8,uW*1.02,vR);
  o=vec4(c*a*e,a*e);
}`,y=`#version 300 es
in vec2 c; uniform mat4 uVP; uniform vec3 uR,uU,uPos; uniform float uS; out vec2 vC;
void main(){ vC=c; gl_Position=uVP*vec4(uPos+(uR*c.x+uU*c.y)*uS,1.); }`,b=`#version 300 es
precision highp float; in vec2 vC; uniform float uA; out vec4 o;
void main(){ float d=length(vC); float a=pow(max(1.-d,0.),3.)*uA; o=vec4(vec3(1.,.42,.1)*a,0.); }`,x=`#version 300 es
in vec2 c; in vec4 aRing; in vec4 aSeed; in vec3 aGlyph;
uniform mat4 uVP; uniform vec3 uR,uU; uniform float uT,uP,uRim,uSpin,uRingA,uIntro;
out vec2 vUv; out float vA; out vec3 vC;
void main(){
  float age=fract(uT*(.02+aSeed.x*.02)+aSeed.y);
  float a6=aSeed.z*6.2832;
  vec3 sm=vec3(0.,uRim+.02,0.);
  float rise=pow(age,.58);
  sm.y+=rise*(5.2+aSeed.w*3.6);
  float sway=age*age;
  sm.z+=sway*2.5+sin(age*4.5+a6)*.42*age;
  sm.x+=sin(age*3.6+a6*1.7)*.5*age+sway*.4;
  float spread=.1+rise*.62+age*age*1.7;
  sm.x+=cos(a6)*spread*aSeed.x; sm.z+=sin(a6)*spread*aSeed.x;
  float size=mix(.2,.74,sqrt(age));
  float roll=(aSeed.z-.5)*1.1+age*1.9*(aSeed.x-.5);
  vec3 Rs=uR*cos(roll)+uU*sin(roll), Us=-uR*sin(roll)+uU*cos(roll);

  float ang=aRing.z+aGlyph.z*uSpin;
  vec3 rad=vec3(cos(ang),0.,sin(ang));
  vec3 rg=rad*aRing.x; rg.y=aRing.y;
  vec3 Rr=vec3(-sin(ang),0.,cos(ang)), Ur=rad;

  float s0=.15+aSeed.w*.2;
  float m=clamp((uP-s0)/.2,0.,1.); m=m*m*(3.-2.*m);
  vec3 p=mix(sm,rg,m); p.y+=sin(m*3.1416)*.7;
  vec3 R=normalize(mix(Rs,Rr,m)), U=normalize(mix(Us,Ur,m));
  float s=mix(size,aRing.w,m);
  gl_Position=uVP*vec4(p+(R*c.x+U*c.y)*s*.72,1.);
  vUv=(c*vec2(.5,-.5)+.5+aGlyph.xy)/vec2(${r}.,${r}.);
  float af=smoothstep(0.,.05,age)*smoothstep(1.,.42,age)*uIntro*step(aSeed.w,.5);
  vA=mix(af*.86,uRingA,m);
  vec3 cs=mix(vec3(1.,.72,.3),vec3(.95,.3,.07),smoothstep(.02,.2,age));
  cs=mix(cs,vec3(.725,.53,.34),smoothstep(.22,.62,age));
  vC=mix(cs,vec3(.94,.91,.87),m);
}`,S=`#version 300 es
precision highp float; in vec2 vUv; in float vA; in vec3 vC; uniform sampler2D uMap; out vec4 o;
void main(){ float a=texture(uMap,vUv).a*vA; o=vec4(vC*a,a); }`;function C(e,t,n){let r=(t,n)=>{let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw Error(e.getShaderInfoLog(r));return r},i=e.createProgram();if(e.attachShader(i,r(e.VERTEX_SHADER,t)),e.attachShader(i,r(e.FRAGMENT_SHADER,n)),e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS))throw Error(e.getProgramInfoLog(i));let a={},o=e.getProgramParameter(i,e.ACTIVE_UNIFORMS);for(let t=0;t<o;t++){let n=e.getActiveUniform(i,t).name;a[n]=e.getUniformLocation(i,n)}return{p:i,u:a,loc:t=>e.getAttribLocation(i,t)}}function w(e){let t=new DataView(e),n=t.getUint32(0,!0),r=4,i=[],a=[];for(let e=0;e<n;e++){let e=t.getUint16(r,!0),n=t.getUint16(r+2,!0);r+=4;let o=0,s=0;for(let c=0;c<n;c++){let n=t.getInt16(r,!0)/3e3,l=t.getInt16(r+2,!0)/3e3;r+=4,c&&(i.push(o,s,n,l),a.push(e)),o=n,s=l}}return{seg:new Float32Array(i),lev:new Float32Array(a)}}async function T(e){await document.fonts.load(`800 190px "Archivo Variable"`).catch(()=>{});let i=document.createElement(`canvas`);i.width=i.height=n*r;let a=i.getContext(`2d`);a.fillStyle=`#fff`,a.textAlign=`center`,a.textBaseline=`middle`,a.font=`800 196px "Archivo Variable", Archivo, sans-serif`;let o={};t.forEach((e,t)=>{a.fillText(e,(t%r+.5)*n,(Math.floor(t/r)+.53)*n),o[e]=a.measureText(e).width/n}),o[` `]=.3;let s=e.createTexture();e.bindTexture(e.TEXTURE_2D,s),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,i),e.generateMipmap(e.TEXTURE_2D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR);let c=e.getExtension(`EXT_texture_filter_anisotropic`);return c&&e.texParameterf(e.TEXTURE_2D,c.TEXTURE_MAX_ANISOTROPY_EXT,8),{texture:s,advance:o}}function E(n,a){let o=(e=>[...e].reduce((e,t)=>e+n[t]*1.04,0))(e),s=[],c=[],l=[];return i.filter((e,t)=>!a||t%7!=0).forEach(([i,a],u)=>{let d=Math.max(1,Math.round(Math.PI*2*i/(o*a*1.28))),f=Math.PI*2*i/(o*d*a),p=u*.9,m=2.05+i*.42,h=(u%2?-1:1)*(.55+u*.05);for(let o=0;o<d;o++)for(let o of e){let e=n[o]*1.04*a*f;if(p+=e/2/i,o!==` `){let e=t.indexOf(o);s.push(i,m,p,a),c.push(Math.random(),Math.random(),Math.random(),Math.random()),l.push(e%r,Math.floor(e/r),h)}p+=e/2/i}}),{ring:new Float32Array(s),seed:new Float32Array(c),glyph:new Float32Array(l),count:s.length/4}}async function D({canvas:e,phone:t,data:n,pace:r=1}){let i=e.getContext(`webgl2`,{antialias:!1,alpha:!1,powerPreference:`high-performance`});if(!i)throw Error(`WebGL2 unavailable`);let{meta:o}=n,l=o.half,u=Math.min(window.devicePixelRatio||1,2),d=C(i,h,g),D=C(i,_,v),O=C(i,y,b),k=C(i,x,S),A=(e,t=i.ARRAY_BUFFER)=>{let n=i.createBuffer();return i.bindBuffer(t,n),i.bufferData(t,e,i.STATIC_DRAW),n},j=(e,t,n,r=0,a=0,o=0)=>{let s=e.loc(t);s<0||(i.enableVertexAttribArray(s),i.vertexAttribPointer(s,n,i.FLOAT,!1,a,o),i.vertexAttribDivisor(s,r))},M=t?2:1,N=Math.floor((o.mesh-1)/M)+1,P=new Float32Array(N*N*3);for(let e=0;e<N;e++)for(let t=0;t<N;t++){let r=(e*N+t)*3;P[r]=(t/(N-1)-.5)*2*l,P[r+1]=(e/(N-1)-.5)*2*l,P[r+2]=n.height[e*M*o.mesh+t*M]/10}let F=new Uint32Array((N-1)*(N-1)*6),I=0;for(let e=0;e<N-1;e++)for(let t=0;t<N-1;t++){let n=e*N+t;F[I++]=n,F[I++]=n+N,F[I++]=n+1,F[I++]=n+1,F[I++]=n+N,F[I++]=n+N+1}let L=i.createVertexArray();i.bindVertexArray(L),A(P),j(d,`a`,2,0,12,0),j(d,`h`,1,0,12,8),A(F,i.ELEMENT_ARRAY_BUFFER);let R=w(n.lines),z=R.lev.length,B=new Float32Array([0,-1,1,-1,0,1,0,1,1,-1,1,1]),V=i.createVertexArray();i.bindVertexArray(V),A(B),j(D,`c`,2),A(R.seg),j(D,`seg`,4,1),A(R.lev),j(D,`lev`,1,1);let H=new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),U=i.createVertexArray();i.bindVertexArray(U),A(H),j(O,`c`,2);let{texture:W,advance:G}=await T(i),K=E(G,t),q=i.createVertexArray();i.bindVertexArray(q),A(H),j(k,`c`,2),A(K.ring),j(k,`aRing`,4,1),A(K.seed),j(k,`aSeed`,4,1),A(K.glyph),j(k,`aGlyph`,3,1),i.enable(i.DEPTH_TEST),i.clearColor(.039,.031,.024,1);let J={p:0,E:2.1,eye:[0,0,0],vp:null,right:[1,0,0],up:[0,1,0],width:1,height:1,white:0,rim:0,lakeY:0,spin:0,ringA:0},Y=performance.now();function X(){let t=e.clientWidth||innerWidth,n=e.clientHeight||innerHeight;e.width=Math.round(t*u),e.height=Math.round(n*u),i.viewport(0,0,e.width,e.height),J.width=t,J.height=n}function Z(e){J.p=e;let t=J.width/J.height,n=Math.max(1,1.18/t),r=s([[0,2.1],[.5,1.35],[1,1.35]],e),i=1.2*r,l=o.lake/1e3*r,u=s([[0,6],[.05,7],[.5,89],[1,89.7]],e)*Math.PI/180,d=s([[0,190],[.5,262],[.74,284],[1,300]],e)*Math.PI/180,h=15.5*Math.min(n,1.9),g=8.6*Math.min(1.36,n*.74+.26),_=s([[0,h],[.05,h*.97],[.5,g],[.74,g],[.9,1.05],[1,1.05]],e),v=[0,s([[0,3.05+ +(n>1.2)],[.05,2.9+ +(n>1.2)],[.5,l],[1,l]],e),0],y=[v[0]+_*Math.cos(u)*Math.cos(d),v[1]+_*Math.sin(u),v[2]+_*Math.cos(u)*Math.sin(d)],b=[-Math.cos(d),0,-Math.sin(d)],x=a(1.15,1.5,u),S=p(y,v,f([b[0]*x,1-x,b[2]*x])),C=m(c(s([[0,26],[.74,26],[.92,50],[1,50]],e),t,Math.max(.05,_*.22),_*3+60),S.m),w=(t>1?.3:0)*(1-a(.05,.3,e));for(let e=0;e<4;e++)C[e*4]+=w*C[e*4+3];J.vp=C,Object.assign(J,{E:r,eye:y,right:S.right,up:S.up,rim:i,lakeY:l}),J.white=a(.8,.93,e),J.wave=a(.84,.95,e)*6,J.ringA=a(.22,.4,e)*(1-a(.82,.885,e))*.96}function Q(e,t,n){let r=J.vp,i=r[3]*e+r[7]*t+r[11]*n+r[15];return i<=0?null:[((r[0]*e+r[4]*t+r[8]*n+r[12])/i*.5+.5)*J.width,(.5-(r[1]*e+r[5]*t+r[9]*n+r[13])/i*.5)*J.height]}function $(t,n){let s=(performance.now()-Y)/1e3/r,c=a(0,1.9,s),l=.02+.98*c,f=J.E*l;J.spin+=n*.035+0;let p=J.spin+J.p*11;i.clear(i.COLOR_BUFFER_BIT|i.DEPTH_BUFFER_BIT),i.disable(i.BLEND),i.depthMask(!0),i.enable(i.POLYGON_OFFSET_FILL),i.polygonOffset(2,3),i.useProgram(d.p),i.uniformMatrix4fv(d.u.uVP,!1,J.vp),i.uniform1f(d.u.uE,f),i.uniform1f(d.u.uHeat,J.p),i.uniform1f(d.u.uW,J.wave||0),i.uniform1f(d.u.uT,t),i.uniform1f(d.u.uLake,o.lake),i.bindVertexArray(L),i.drawElements(i.TRIANGLES,F.length,i.UNSIGNED_INT,0),i.disable(i.POLYGON_OFFSET_FILL),i.enable(i.BLEND),i.blendFunc(i.ONE,i.ONE_MINUS_SRC_ALPHA),i.depthMask(!1),i.useProgram(D.p),i.uniformMatrix4fv(D.u.uVP,!1,J.vp),i.uniform2f(D.u.uRes,e.width,e.height),i.uniform1f(D.u.uE,f),i.uniform1f(D.u.uDpr,u),i.uniform1f(D.u.uGrow,1+a(.72,.92,J.p)*1.2),i.uniform1f(D.u.uT,t),i.uniform1f(D.u.uW,J.wave||0),i.uniform1f(D.u.uReveal,1500*a(0,1.5,s)),i.bindVertexArray(V),i.drawArraysInstanced(i.TRIANGLES,0,6,z),i.disable(i.DEPTH_TEST),i.blendFunc(i.ONE,i.ONE),i.useProgram(O.p),i.uniformMatrix4fv(O.u.uVP,!1,J.vp),i.uniform3fv(O.u.uR,J.right),i.uniform3fv(O.u.uU,J.up),i.uniform3f(O.u.uPos,0,1.2*f+.1,0),i.uniform1f(O.u.uS,2.5),i.uniform1f(O.u.uA,.26*c*(1-a(.6,.8,J.p))),i.bindVertexArray(U),i.drawArrays(i.TRIANGLES,0,6),i.enable(i.DEPTH_TEST),i.blendFunc(i.ONE,i.ONE_MINUS_SRC_ALPHA),i.useProgram(k.p),i.uniformMatrix4fv(k.u.uVP,!1,J.vp),i.uniform3fv(k.u.uR,J.right),i.uniform3fv(k.u.uU,J.up),i.uniform1f(k.u.uT,t),i.uniform1f(k.u.uP,J.p),i.uniform1f(k.u.uRim,1.2*f),i.uniform1f(k.u.uSpin,p),i.uniform1f(k.u.uRingA,J.ringA),i.uniform1f(k.u.uIntro,a(.9,2.2,s)),i.uniform1i(k.u.uMap,0),i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,W),i.bindVertexArray(q),i.drawArraysInstanced(i.TRIANGLES,0,6,K.count)}function ee(){return u<=1?!1:(u=Math.max(1,u*.85),X(),!0)}return X(),Z(0),{render:$,resize:X,setProgress:Z,lowerQuality:ee,project:Q,state:J,meta:o,restartIntro:()=>{Y=performance.now()}}}export{D as createScene};