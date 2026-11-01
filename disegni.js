/* Disegni delle piante (SVG fatti a mano), usati finché una pianta non ha una foto. */
function art(kind,c,seed=1){
  const [d,l]=c, pot=`<path d="M70 150h60l-7 42H77z" fill="#B9774E"/><rect x="64" y="142" width="72" height="13" rx="4" fill="#CC8A5E"/>`;
  let g="",front="";
  const R=(a,b)=>a+((Math.sin(seed*97.13+a*7.7+b)*.5+.5)*(b-a));
  if(kind==="monstera"){
    [[-40,100],[-10,70],[25,62],[50,95],[5,105]].forEach(([r,len],k)=>{
      const col=k%2?l:d;
      g+=`<g transform="translate(100 146) rotate(${r})"><path d="M0 0 C0 -${len*.4} 0 -${len*.6} 0 -${len}" stroke="${d}" stroke-width="3" fill="none"/>
      <path d="M0 -${len} c-34 -4 -42 -40 -6 -56 c40 -8 50 34 6 56z" fill="${col}"/>
      <path d="M-14 -${len+18} l10 4 M-18 -${len+34} l12 6 M10 -${len+22} l-10 4 M14 -${len+38} l-12 6" stroke="var(--surface-2)" stroke-width="4" stroke-linecap="round"/></g>`});
  } else if(kind==="spike"){
    for(let k=0;k<7;k++){const r=-30+k*10+R(-3,3),h=R(85,125),col=k%2?l:d;
      g+=`<g transform="translate(100 148) rotate(${r})"><path d="M-7 0 C-10 -${h*.6} -4 -${h*.9} 0 -${h} C4 -${h*.9} 10 -${h*.6} 7 0z" fill="${col}"/><path d="M0 -6 V-${h-14}" stroke="${d}" stroke-width="1" opacity=".5"/></g>`}
  } else if(kind==="trailing"){
    for(let k=0;k<4;k++){const x=[70,76,138,144][k];
      front+=`<path d="M${x} 146 C${x+(k<2?-14:6)} ${170+k*4} ${x+(k<2?-16:10)} 186 ${x+(k<2?-8:6)} 200" stroke="${d}" stroke-width="2" fill="none"/>`;
      for(let j=0;j<3;j++){front+=`<path transform="translate(${x+(k<2?-8-j*4:4+j*3)} ${160+j*13+k*2}) rotate(${-20+j*25})" d="M0 9 C-12 3 -11 -8 -4 -8 C-1 -8 0 -6 0 -5 C0 -6 1 -8 4 -8 C11 -8 12 3 0 9z" fill="${(j+k)%2?l:d}"/>`;0&&`<ellipse cx="0" cy="${158+j*14+k*3}" rx="9" ry="6" transform="rotate(${-30+j*20} ${x-10-j*6+k*3} ${158+j*14+k*3})" fill="${(j+k)%2?l:d}"/>`}}
    for(let k=0;k<7;k++){const r=-60+k*20,h=R(30,55);g+=`<g transform="translate(100 146) rotate(${r})"><path d="M0 0 V-${h}" stroke="${d}" stroke-width="2.5"/><path d="M0 -${h} C-16 -${h+8} -15 -${h+26} -5 -${h+26} C-2 -${h+26} 0 -${h+23} 0 -${h+22} C0 -${h+23} 2 -${h+26} 5 -${h+26} C15 -${h+26} 16 -${h+8} 0 -${h}z" fill="${k%2?l:d}"/></g>`}
  } else if(kind==="fern"){
    for(let k=0;k<7;k++){const r=-55+k*18,h=R(80,110);
      let lv="";for(let j=1;j<10;j++){const y=-h*j/10,s=9*(1-j/12);lv+=`<ellipse cx="-${s}" cy="${y}" rx="${s}" ry="3" fill="${j%2?l:d}"/><ellipse cx="${s}" cy="${y}" rx="${s}" ry="3" fill="${j%2?d:l}"/>`}
      g+=`<g transform="translate(100 146) rotate(${r})"><path d="M0 0 V-${h}" stroke="${d}" stroke-width="2"/>${lv}</g>`}
  } else if(kind==="round"){
    [[-35,70],[-12,95],[15,80],[38,60],[0,58]].forEach(([r,h],k)=>{
      g+=`<g transform="translate(100 146) rotate(${r})"><path d="M0 0 V-${h}" stroke="${d}" stroke-width="3"/><ellipse cx="0" cy="-${h+18}" rx="17" ry="25" fill="${k%2?l:d}"/><path d="M0 -${h} V-${h+40}" stroke="var(--surface-2)" stroke-width="1.5" opacity=".7"/></g>`});
  } else if(kind==="cactus"){
    g+=`<rect x="84" y="56" width="32" height="96" rx="16" fill="${d}"/><rect x="54" y="86" width="22" height="44" rx="11" fill="${l}"/><path d="M76 116h10" stroke="${l}" stroke-width="10" stroke-linecap="round"/>
    <rect x="124" y="74" width="20" height="40" rx="10" fill="${l}"/><path d="M114 104h12" stroke="${l}" stroke-width="10" stroke-linecap="round"/>
    <path d="M100 62v84M92 66v76M108 66v76" stroke="var(--surface-2)" stroke-width="1" opacity=".35"/><circle cx="100" cy="54" r="6" fill="#E98AA8"/>`;
  } else if(kind==="orchid"){
    g+=`<ellipse cx="82" cy="138" rx="26" ry="9" fill="${d}" transform="rotate(-12 82 138)"/><ellipse cx="118" cy="138" rx="26" ry="9" fill="${d}" transform="rotate(12 118 138)"/>
    <path d="M100 140 C100 100 112 70 132 56" stroke="#5B7A4E" stroke-width="2.5" fill="none"/>`;
    [[108,96],[116,78],[128,62],[140,52]].forEach(([x,y],k)=>{const s=k===3?.6:1;
      g+=`<g transform="translate(${x} ${y}) scale(${s})">${[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-9" rx="7" ry="10" fill="${l}" transform="rotate(${a})"/>`).join("")}<circle r="4" fill="#F6E27A"/></g>`});
  } else if(kind==="coin"){
    for(let k=0;k<9;k++){const r=-60+k*15,h=R(40,85);
      g+=`<g transform="translate(100 146) rotate(${r})"><path d="M0 0 V-${h}" stroke="${d}" stroke-width="2"/><circle cx="0" cy="-${h+12}" r="${R(11,16)}" fill="${k%2?l:d}"/></g>`}
  }
  return `<svg class="art" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="200" height="200" fill="var(--surface-2)"/>
    <circle cx="${R(40,160)}" cy="${R(30,80)}" r="70" fill="${l}" opacity=".12"/>
    <ellipse cx="100" cy="194" rx="56" ry="6" fill="#000" opacity=".08"/>
    <g class="sway" style="animation-delay:-${R(0,6).toFixed(1)}s">${g}</g>${pot}${front}</svg>`;
}
