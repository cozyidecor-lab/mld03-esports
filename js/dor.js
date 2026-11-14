/* ================= MLD Ballon d'Or (S13–S15) — PRIVATE owner-only engine =================
   This is the real MLD D'or scoring from WaCky's handoff. It is SEPARATE from the website's
   all-time stats (js/data.js): the D'or uses its own authoritative logs so it always matches the
   Excel tracker. Shown only in the owner-only view (see isOwner() in app.js). NEVER public.

   Performance Score (/80): five categories, each scored RELATIVE TO THE CATEGORY LEADER
   (your value ÷ the leader's value × the weight), then summed.
     Total Goals        25  — goals across individual-stat tournaments (not Co-op)
     Rating             20  — Rating Score = avg rating × ln(1 + tournaments played)
     Championships      20  — championship points (by format, winners AND runners-up; incl Co-op)
     Individual Awards  10  — Top Scorer/MOTT (1 each) + season Golden Boot/Ball (3 each)
     Consistency/Long.   5  — individual-stat tournaments played
   Jury vote (/20, top 5 only) is added at the ceremony after S15 — not here yet.

   To add a tournament: append its rows to LOG (individual-stat only), CH (championship points by
   format) and AW (per-tournament + season-wide awards). Then the standings recompute automatically.
   Championship points by format — Swiss 10/8/6/4/2 · League 8/6/4/2 · Rounds+KO 8/5 · UCL 10/8 (winner/runner-up only) · Team Tour 5/3 · Co-op 2/1. */
(function(){
  const W={goals:25,rating:20,champ:20,awards:10,longevity:5};
  const THROUGH='Season 14 — Solo Authentic';   // latest tournament logged into the D'or
  const TOURS_IN=['S13 Solo Authentic (Rounds+KO)','S13 Swiss League','S13 Team Tour','S14 Solo Authentic (UCL)'];

  /* ---- individual-stat tournament log: [type, player, goals, rating]  (rating null = not sent) ---- */
  const LOG=[
    // S13 Solo Authentic (Rounds + Knockout)
    ['SA','Ashik',24,18],['SA','Farza',20,16],['SA','Shahid Mubarak',15,12],['SA','Eleven',15,11],
    ['SA','Harris',13,10],['SA','Junaid Ansari',12,10],['SA','Arun',11,12],['SA','Pranav CK',10,6],
    ['SA','Salman',10,6],['SA','Rashid',10,5],['SA','Ronney',9,6],['SA','Rinshad',9,6],
    ['SA','Vishnu',8,6],['SA','Millaj',8,6],['SA','Bujji',8,4],['SA','Joyal',8,6],['SA','Diyan',8,8],
    ['SA','Siyan',7,6],['SA','Athif',6,4],['SA','Nabeel',5,3],['SA','Zayid',5,4],['SA','Cijin',5,4],
    ['SA','Nezel',5,4],['SA','Kriz',4,1],['SA','Midhun',4,4],['SA','Arjun',4,5],['SA','WaCky',4,1],
    ['SA','Sreedev',3,0],['SA','Aadil',3,3],['SA','Bilal',3,1],['SA','Anurag',2,0],['SA','Didhi',2,0],
    ['SA','Notblack',2,3],['SA','Zainudheen',1,0],['SA','Shijas',1,0],['SA','Razin',0,0],
    // S13 Swiss League (Solo Dream) — rating = league points (Pts column)
    ['SW','Rashid',17,14],['SW','Ig Ezio',10,14],['SW','Sreedev',11,14],['SW','Vishnu',11,14],
    ['SW','Rasim',12,13],['SW','Senpai',19,12],['SW','Pranav CK',15,12],['SW','Harris',12,12],
    ['SW','Siyan',12,12],['SW','Midhun',10,12],['SW','Sathwik',10,11],['SW','Arun',17,10],
    ['SW','Rmees',10,10],['SW','Shahid Mubarak',11,10],['SW','Ronney',15,9],['SW','Cijin',17,9],
    ['SW','Eleven',10,9],['SW','Kriz',5,9],['SW','Thanveer',8,9],['SW','Ashik',10,9],['SW','Pepe',10,9],
    ['SW','WaCky',14,9],['SW','Salman',8,8],['SW','Yodhith',12,7],['SW','Diyan',6,7],['SW','Rinshad',11,7],
    ['SW','Shiyas',8,7],['SW','Nezel',9,7],['SW','Millaj',8,7],['SW','Nabeel',6,7],['SW','Bilal',2,6],
    ['SW','Zainudheen',11,6],['SW','Zayid',9,6],['SW','Aadil',11,6],['SW','Shimnad',12,5],
    ['SW','Notblack',1,5],['SW','Bujji',9,4],['SW','Pranav',6,4],['SW','Didhi',6,4],
    ['SW','Junaid Ansari',8,3],['SW','Arjun',2,2],['SW','Joyal',6,2],
    // S13 Team Tour
    ['TT','Fahiz',39,22],['TT','Pranav CK',38,21],['TT','Senpai',36,27],['TT','Rasim',35,26],
    ['TT','Zayid',34,19],['TT','Siyan',33,21],['TT','Ashik',32,22],['TT','Sabith J R',26,22],
    ['TT','Vishnu',26,24],['TT','Nezel',26,22],['TT','Harris',25,22],['TT','Farza',25,24],
    ['TT','Sabith',23,20],['TT','Midhun',23,20],['TT','Sathwik',21,15],['TT','Bilal',20,21],
    ['TT','Jibin Johny',19,11],['TT','Eleven',19,13],['TT','Husnu',19,13],['TT','Sreedev',18,14],
    ['TT','Nabeel',18,13],['TT','Shahid KT',18,11],['TT','Joyal',16,5],['TT','Shahid Mubarak',16,19],
    ['TT','Arjun',15,11],['TT','Diyan',15,13],['TT','Arun',15,12],['TT','Rashid',14,8],['TT','Salman',14,19],
    ['TT','Bujji',14,10],['TT','Millaj',14,7],['TT','Cijin',14,13],['TT','Junaid Ansari',14,16],
    ['TT','Nahyan',13,17],['TT','Akshay',12,1],['TT','Jawahar',12,11],['TT','Aadil',12,12],
    ['TT','Fadhi',12,5],['TT','Ig Ezio',12,12],['TT','Shimnad',11,10],['TT','Kriz',10,4],['TT','Hijjas',9,2],
    ['TT','Thanveer',8,14],['TT','Goal Wol ve',8,8],['TT','Pepe',8,9],['TT','Didhi',6,null],
    ['TT','Sugith',1,null],['TT','Jishnu',0,4],
    // S14 Solo Authentic (UCL format) — goals & ratings from the website data
    ['A14','T-REX',22,21],['A14','Rasim',22,16],['A14','Harris',20,13],['A14','Raslu',20,12],['A14','Diyan',19,15],
    ['A14','Zayee',19,9],['A14','Cijin',18,19],['A14','Hudaifa',17,10],['A14','Shijas',16,15],['A14','NaadanNeymar',15,15],
    ['A14','Sharafath',14,6],['A14','Arun',14,12],['A14','NG',14,7],['A14','Salman',14,11],['A14','Shamil',13,9],
    ['A14','Siyan',13,10],['A14','Junaid Ansari',13,10],['A14','Melvin',11,4],['A14','Amal',11,6],['A14','Shahabas',11,4],
    ['A14','Senpai',11,4],['A14','WaCky',11,6],['A14','MUZAMLLLL',10,10],['A14','Millaj',10,9],['A14','Rashid',10,9],
    ['A14','JAX',10,5],['A14','PINKMAN',10,3],['A14','Aadil',9,6],['A14','Aheed',9,9],['A14','Razeen kk',9,4],
    ['A14','Jawahar',9,9],['A14','Pranav CK',9,6],['A14','Rihan',8,9],['A14','Abhilash',8,7],['A14','Bujji',8,2],
    ['A14','Bombargilino',8,3],['A14','Raziq',8,9],['A14','Nahyan',8,1],['A14','Shahid Mubarak',8,6],['A14','Midhun',7,7],
    ['A14','Jihad',7,9],['A14','Kriz',7,4],['A14','Sheheel',7,6],['A14','Nabeel',7,6],['A14','Athif',7,2],
    ['A14','Haseeb',7,3],['A14','Thanveer',6,6],['A14','Bilal',6,6],['A14','Nezel',6,3],['A14','Ig Ezio',6,6],
    ['A14','Didhi',6,5],['A14','Vishnu',6,9],['A14','Vijesh',6,7],['A14','Mhd Nafihh',6,1],['A14','Akmar',6,6],
    ['A14','Anandhu01',6,3],['A14','Rashed',5,6],['A14','Nikhil',5,4],['A14','Rmees',5,3],['A14','Haneef',5,4],
    ['A14','Dilshad',5,3],['A14','Sabith',4,3],['A14','Ashik',4,6],['A14','Eleven',4,0],['A14','Noob',4,0],
    ['A14','Pranav',4,0],['A14','Drom',3,1],['A14','Zainudheen',3,1],['A14','Ameer',3,0],['A14','Jahan',3,0],
    ['A14','Ronney',3,1],['A14','Sanu Divakar',2,2],['A14','Flash_15',2,1],['A14','JONSNOW-RSE',2,1],['A14','Shiyas',1,1]
  ];

  /* ---- championship points: [format, player, result, points] ---- */
  const CH=[
    ['Rounds+KO','Ashik','Winner',8],['Rounds+KO','Farza','Runner-up',5],
    ['Co-op','Siyan','Winner',2],['Co-op','Harris','Winner',2],['Co-op','Millaj','Runner-up',1],['Co-op','Junaid Ansari','Runner-up',1],
    ['Swiss','Rashid','1st',10],['Swiss','Ig Ezio','2nd',8],['Swiss','Sreedev','3rd',6],['Swiss','Vishnu','4th',4],['Swiss','Rasim','5th',2],
    ['Team Tour','Bilal','Winner',5],['Team Tour','Rasim','Winner',5],['Team Tour','Senpai','Winner',5],['Team Tour','Nahyan','Winner',5],
    ['Team Tour','Akshay','Winner',5],['Team Tour','Arun','Winner',5],['Team Tour','Sabith','Winner',5],['Team Tour','Shahid KT','Winner',5],
    ['Team Tour','Aadil','Runner-up',3],['Team Tour','Vishnu','Runner-up',3],['Team Tour','Husnu','Runner-up',3],['Team Tour','Ashik','Runner-up',3],
    ['Team Tour','Jawahar','Runner-up',3],['Team Tour','Jibin Johny','Runner-up',3],['Team Tour','Eleven','Runner-up',3],['Team Tour','Farza','Runner-up',3],
    // S14 Solo Authentic (UCL format): winner 10, runner-up 8 (no points below 2nd)
    ['UCL','T-REX','Winner',10],['UCL','Cijin','Runner-up',8]
  ];

  /* ---- award points: [tournament, award, player, points] ---- */
  const AW=[
    ['Solo Authentic','Top Scorer','Ashik',1],['Solo Authentic','MOTT','Ashik',1],
    ['Swiss League','Top Scorer','Senpai',1],
    ['Team Tour','Top Scorer','Fahiz',1],['Team Tour','MOTT','Senpai',1],
    ['Season','Golden Boot','Ashik',3],['Season','Golden Ball','Ashik',3],
    // S14 Solo Authentic per-tournament awards (season-wide Golden Boot/Ball come only when S14 finishes)
    ['S14 Solo Authentic','Top Scorer','T-REX',1],['S14 Solo Authentic','Top Scorer','Rasim',1],['S14 Solo Authentic','MOTT','T-REX',1]
  ];

  function standings(){
    const P={},get=n=>P[n]||(P[n]={n,goals:0,rs:[],tours:0,champ:0,awards:0});
    LOG.forEach(([,n,g,r])=>{const o=get(n);o.goals+=g||0;o.tours++;if(r!=null)o.rs.push(r);});
    CH.forEach(([,n,,pts])=>{get(n).champ+=pts;});           // CH rows: [format, player, result, points]
    AW.forEach(([,,n,pts])=>{get(n).awards+=pts;});          // AW rows: [tournament, award, player, points]
    const list=Object.values(P).map(o=>{
      o.avg=o.rs.length?o.rs.reduce((a,b)=>a+b,0)/o.rs.length:0;
      o.ratingScore=o.tours?o.avg*Math.log(1+o.tours):0;o.longevity=o.tours;return o;});
    const mx=k=>Math.max(1,...list.map(o=>o[k]));
    const mg=mx('goals'),mr=mx('ratingScore'),mc=mx('champ'),ma=mx('awards'),ml=mx('longevity');
    list.forEach(o=>{o.perf=(o.goals/mg)*W.goals+(o.ratingScore/mr)*W.rating+(o.champ/mc)*W.champ+(o.awards/ma)*W.awards+(o.longevity/ml)*W.longevity;});
    return list.sort((a,b)=>b.perf-a.perf||b.goals-a.goals);
  }
  window.DOR={standings,THROUGH,TOURS_IN,weights:W};
})();
