/* ================= MLD Achievements: the calculation engine =================
   Pure logic, no drawing. Works on window.MLD_DATA (js/data.js), which is the site's database.

   How it works: every completed tournament in the records is replayed in order
   (season by season, Authentic → Co-op → Dream Team → Team Tour). After each one, every achievement
   is checked. The first time a player meets a condition, the achievement unlocks and is stamped with
   that tournament ("S9 Team Tour"). Because the history is replayed, an unlock is permanent: a rating
   that later drops does not take it away, and correcting old data simply recalculates everything.
   Nothing can be unlocked by hand: the only input is the recorded stats.

   Data rules (from the owner):
   - Co-op counts for appearances, wins, runner-ups and championship achievements,
     but never for goals, ratings or individual awards.
   - Season-level achievements wait until the season is finalised: Seasons 1–12 (one Team Tour each)
     are final when their Team Tour is recorded; from Season 13, a season is final once its
     season-wide awards are recorded (data.seasonAwards).
   - Only completed tournaments are ever added to data.js, so an ongoing tournament cannot unlock anything. */
const ACHE=(function(){
  const ORDER=['A','C','D','T'];
  const TN={T:'Team Tour',A:'Solo Authentic',D:'Solo Dream Team',C:'Co-op'};
  const FMT3=['A','D','T']; // formats with individual awards

  /* ---------- the 49 achievements ---------- */
  // r: rarity 1 Common · 2 Uncommon · 3 Rare · 4 Epic · 5 Legendary
  // p(state) → [current, target]; unlocked when current ≥ target
  const L=[
    // A. Career & Goals
    ['first-steps','Career','👟','First Steps','Play your first MLD tournament.','1 tournament appearance',1,s=>[s.apps,1]],
    ['rising-star','Career','🌱','Rising Star','Five tournaments in.','5 tournament appearances',1,s=>[s.apps,5]],
    ['regular','Career','📅','MLD Regular','A familiar face in every draw.','10 tournament appearances',2,s=>[s.apps,10]],
    ['veteran','Career','🎖️','MLD Veteran','Part of the furniture.','25 tournament appearances',4,s=>[s.apps,25]],
    ['icon','Career','🏛️','MLD Icon','Fifty tournaments. A true icon.','50 tournament appearances',5,s=>[s.apps,50]],
    ['century','Career','⚽','Century Club','A hundred MLD goals.','100 career goals (Co-op excluded)',2,s=>[s.goals,100]],
    ['goal-machine','Career','🔥','Goal Machine','Two hundred and counting.','200 career goals (Co-op excluded)',3,s=>[s.goals,200]],
    ['goal-hunter','Career','🎯','Goal Hunter','Three hundred goals.','300 career goals (Co-op excluded)',4,s=>[s.goals,300]],
    ['goal-legend','Career','👑','Goal Legend','Four hundred goals. Rare air.','400 career goals (Co-op excluded)',5,s=>[s.goals,400]],
    ['immortal','Career','💫','Immortal Scorer','Five hundred goals. Unheard of.','500 career goals (Co-op excluded)',5,s=>[s.goals,500]],
    // B. Tournament Success
    ['first-crown','Success','🏆','First Crown','Lift your first MLD trophy.','Win 1 tournament (any format, Co-op included)',2,s=>[s.wins,1]],
    ['double-champ','Success','✌️','Double Champion','Two trophies in the cabinet.','Win 2 tournaments',3,s=>[s.wins,2]],
    ['triple-champ','Success','🥇','Triple Champion','Three-time champion.','Win 3 tournaments',3,s=>[s.wins,3]],
    ['five-star','Success','🌟','Five-Star Champion','Five titles. Elite company.','Win 5 tournaments',4,s=>[s.wins,5]],
    ['dynasty','Success','🏰','Dynasty','Ten titles. A dynasty.','Win 10 tournaments',5,s=>[s.wins,10]],
    ['silver-medal','Success','🥈','Silver Medal','Reach a final and finish runner-up.','Finish runner-up once',1,s=>[s.ru,1]],
    ['silver-collector','Success','🪙','Silver Collector','Five runner-up finishes.','Finish runner-up 5 times',4,s=>[s.ru,5]],
    ['serial-finalist','Success','🔁','Serial Finalist','Ten runner-up finishes.','Finish runner-up 10 times',5,s=>[s.ru,10]],
    ['win-T1','Success','🏆','Team Tour Champion','Win Team Tour.','Win Team Tour once',1,s=>[s.winBy.T||0,1]],
    ['win-T2','Success','🏆','Team Tour Double Champion','Two Team Tour titles.','Win Team Tour 2 times',2,s=>[s.winBy.T||0,2]],
    ['win-T3','Success','🏆','Team Tour Triple Champion','Three Team Tour titles.','Win Team Tour 3 times',3,s=>[s.winBy.T||0,3]],
    ['win-T5','Success','🏆','Team Tour Five-Time Champion','Five Team Tour titles.','Win Team Tour 5 times',4,s=>[s.winBy.T||0,5]],
    ['win-A1','Success','🎯','Authentic Champion','Win Solo Authentic.','Win Solo Authentic once',2,s=>[s.winBy.A||0,1]],
    ['win-A2','Success','🎯','Authentic Double Champion','Two Solo Authentic titles.','Win Solo Authentic 2 times',3,s=>[s.winBy.A||0,2]],
    ['win-A3','Success','🎯','Authentic Triple Champion','Three Solo Authentic titles.','Win Solo Authentic 3 times',4,s=>[s.winBy.A||0,3]],
    ['win-A5','Success','🎯','Authentic Five-Time Champion','Five Solo Authentic titles.','Win Solo Authentic 5 times',5,s=>[s.winBy.A||0,5]],
    ['win-D1','Success','⭐','Dream Team Champion','Win Solo Dream Team.','Win Solo Dream Team once',2,s=>[s.winBy.D||0,1]],
    ['win-D2','Success','⭐','Dream Team Double Champion','Two Solo Dream Team titles.','Win Solo Dream Team 2 times',3,s=>[s.winBy.D||0,2]],
    ['win-D3','Success','⭐','Dream Team Triple Champion','Three Solo Dream Team titles.','Win Solo Dream Team 3 times',4,s=>[s.winBy.D||0,3]],
    ['win-D5','Success','⭐','Dream Team Five-Time Champion','Five Solo Dream Team titles.','Win Solo Dream Team 5 times',5,s=>[s.winBy.D||0,5]],
    ['win-C1','Success','🤝','Co-op Champion','Win Co-op.','Win Co-op once',2,s=>[s.winBy.C||0,1]],
    ['win-C2','Success','🤝','Co-op Double Champion','Two Co-op titles.','Win Co-op 2 times',3,s=>[s.winBy.C||0,2]],
    ['win-C3','Success','🤝','Co-op Triple Champion','Three Co-op titles.','Win Co-op 3 times',4,s=>[s.winBy.C||0,3]],
    ['win-C5','Success','🤝','Co-op Five-Time Champion','Five Co-op titles.','Win Co-op 5 times',5,s=>[s.winBy.C||0,5]],
    ['four-format','Success','🧩','Four-Format Champion','Champion in every format.','Win Team Tour, Solo Authentic, Solo Dream Team and Co-op at least once',4,s=>[s.winTypes.size,4]],
    ['complete-dominance','Success','🌍','Complete Dominance','Win everything in one season.','Win all four tournaments in the same season',5,s=>[s.bestSeasonWins,4]],
    // C. Individual Awards (never Co-op)
    ['boot-1','Awards','🥾','Golden Boot Winner','Top scorer of a tournament.','Win 1 tournament Golden Boot',2,s=>[s.boots,1]],
    ['ball-1','Awards','🔮','Golden Ball Winner','Best rated player of a tournament.','Win 1 tournament Golden Ball',2,s=>[s.balls,1]],
    ['double-glory','Awards','⚡','Double Glory','Top scorer and best player at once.','Win the Golden Boot and Golden Ball in the same tournament',3,s=>[s.doubleGlory,1]],
    ['boot-3','Awards','👢','Golden Boot Collector','Three Golden Boots.','Win 3 tournament Golden Boots',4,s=>[s.boots,3]],
    ['ball-3','Awards','🌐','Golden Ball Collector','Three Golden Balls.','Win 3 tournament Golden Balls',4,s=>[s.balls,3]],
    ['boot-5','Awards','🦶','Golden Boot Legend','Five Golden Boots.','Win 5 tournament Golden Boots',5,s=>[s.boots,5]],
    ['ball-5','Awards','🪐','Golden Ball Legend','Five Golden Balls.','Win 5 tournament Golden Balls',5,s=>[s.balls,5]],
    ['season-ball','Awards','✨','Season\'s Finest','Best player of a whole season.','Win the season-wide Golden Ball',4,s=>[s.sballs,1]],
    ['season-boot','Awards','🎇','Season\'s Top Scorer','Top scorer of a whole season.','Win the season-wide Golden Boot',4,s=>[s.sboots,1]],
    ['season-dominator','Awards','👁️','Season Dominator','Owned an entire season.','Win the season-wide Golden Boot and Golden Ball in the same season',5,s=>[s.seasonBoth,1]],
    // D. Rating (the all-time rating on the Top Ratings page: avg rating × ln(1 + tournaments))
    ['rated-20','Rating','📈','Rated Player','Reach an average rating of 20.','Average rating 20 (unlocks for good once reached)',1,s=>[s.csPeak,20]],
    ['rated-30','Rating','📊','Elite Rating','Reach an average rating of 30.','Average rating 30 (unlocks for good once reached)',2,s=>[s.csPeak,30]],
    ['rated-40','Rating','💹','Master Rating','Reach an average rating of 40.','Average rating 40 (unlocks for good once reached)',3,s=>[s.csPeak,40]],
    ['rated-50','Rating','🚀','Legendary Rating','Reach an average rating of 50.','Average rating 50 (unlocks for good once reached)',4,s=>[s.csPeak,50]],
    ['rating-top10','Rating','🔟','Rating Top 10','Break into the all-time rating top 10.','Reach the top 10 of the Top Ratings leaderboard (unlocks for good)',3,s=>[s.bestRank&&s.bestRank<=10?1:0,1]],
    // E. Consistency & Special
    ['award-regular','Special','📆','Award Regular','Individual awards across three seasons.','Win individual awards in 3 different seasons',4,s=>[s.awardSeasons.size,3]],
    ['boot-streak','Special','🔥','Golden Consistency','Golden Boot three seasons running.','Win a Golden Boot in 3 consecutive seasons',5,s=>[s.bootStreak,3]],
    ['ball-streak','Special','🌀','Golden Ball Streak','Golden Ball three seasons running.','Win a Golden Ball in 3 consecutive seasons',5,s=>[s.ballStreak,3]],
    ['podium-regular','Special','🏅','Podium Regular','Always there at the end.','Finish as winner or runner-up 10 times',4,s=>[s.wins+s.ru,10]],
    ['award-collector','Special','🗃️','Award Collector','Five individual awards.','Win 5 individual awards (Golden Boots and Golden Balls)',4,s=>[s.awardsN,5]],
    ['three-format','Special','🎛️','Three-Format Excellence','Award winner in every solo and team format.','Win an individual award in Solo Authentic, Solo Dream Team and Team Tour',4,s=>[s.awardFormats.size,3]],
    ['perfect-season','Special','💎','Perfect Season','Golden Ball in all three formats in one season.','Win the Golden Ball in Solo Authentic, Solo Dream Team and Team Tour in the same season',5,s=>[s.bestBallSeason,3]],
    ['golden-sweep','Special','🧹','Golden Sweep','Golden Boot in all three formats in one season.','Win the Golden Boot in Solo Authentic, Solo Dream Team and Team Tour in the same season',5,s=>[s.bestBootSeason,3]],
    // F. MLD d'Or
    ['dor-30','d\'Or','🎗️','d\'Or Contender','Named in the MLD d\'Or top 30.','Finish in a published MLD d\'Or top 30',3,s=>[s.dorBest&&s.dorBest<=30?1:0,1]],
    ['dor-10','d\'Or','🎟️','d\'Or Elite','MLD d\'Or top 10.','Finish in the MLD d\'Or top 10',4,s=>[s.dorBest&&s.dorBest<=10?1:0,1]],
    ['dor-3','d\'Or','🏵️','d\'Or Podium','MLD d\'Or top 3.','Finish in the MLD d\'Or top 3',5,s=>[s.dorBest&&s.dorBest<=3?1:0,1]],
    ['dor-1','d\'Or','🏆','MLD d\'Or Winner','The highest honour in MLD.','Win the MLD d\'Or',5,s=>[s.dorWins,1]],
    ['dor-2','d\'Or','👑','Two-Time d\'Or Winner','Twice the best in MLD.','Win the MLD d\'Or twice',5,s=>[s.dorWins,2]],
    ['dor-3x','d\'Or','🐐','Three-Time d\'Or Winner','Three times the best. A legend forever.','Win the MLD d\'Or three times',5,s=>[s.dorWins,3]],
    // G. Managers (Team Tour only)
    ['mgr-1','Manager','📋','The Gaffer','Take charge of a team.','Manage a team in a Team Tour',2,s=>[s.mgApps,1]],
    ['mgr-5','Manager','🧠','Touchline Veteran','Five tournaments in the dugout.','Manage a team in 5 Team Tours',4,s=>[s.mgApps,5]],
    ['mgr-final','Manager','🎽','Final Whistle','Lead a team all the way to the final.','Reach a Team Tour final as manager (winner or runner-up)',3,s=>[s.mgFinals,1]],
    ['mgr-win','Manager','🏆','Title-Winning Manager','Win the Team Tour from the dugout.','Win a Team Tour as manager',3,s=>[s.mgWins,1]],
    ['mgr-win2','Manager','🎩','Serial Winner','Two Team Tour titles as manager.','Win 2 Team Tours as manager',4,s=>[s.mgWins,2]],
    ['mgr-win3','Manager','🏟️','Managerial Dynasty','Three Team Tour titles as manager.','Win 3 Team Tours as manager',5,s=>[s.mgWins,3]],
    ['mgr-b2b','Manager','🔂','Back-to-Back Boss','Defend the title from the dugout.','Win the Team Tour as manager in consecutive seasons',5,s=>[s.mgStreak,2]],
    ['player-manager','Manager','🔄','Player & Manager','Champion on the pitch and on the touchline.','Win a Team Tour as a player and win one as a manager',4,s=>[(s.playerT?1:0)+(s.mgWins?1:0),2]],
  ].map(([id,cat,ic,name,desc,cond,rar,p])=>({id,cat,ic,name,desc,cond,rar,p}));
  const RARITY=['','Common','Uncommon','Rare','Epic','Legendary'];
  const CATS=['Career','Success','Awards','Rating','Special','d\'Or','Manager'];
  const CAT_NAME={Career:'Career & Goals',Success:'Tournament Success',Awards:'Individual Awards',Rating:'Rating',Special:'Consistency & Special','d\'Or':'MLD d\'Or',Manager:'Managers'};

  const names=v=>String(v||'').split(/\s*,\s*/).filter(Boolean);
  const streak=set=>{const a=[...set].sort((x,y)=>x-y);let b=0,c=0,prev=null;a.forEach(v=>{c=prev!==null&&v===prev+1?c+1:1;b=Math.max(b,c);prev=v;});return b;};

  /* ---------- replay the history ---------- */
  function evaluate(D,opt){
    opt=opt||{};
    const players=(D.players||[]).filter(p=>!p.side).map(p=>p.n);
    const S={};
    const st=n=>S[n]||(S[n]={n,apps:0,tours:new Set(),goals:0,rows:0,rSum:0,rN:0,cs:0,csPeak:0,bestRank:null,rank:null,wins:0,ru:0,winTypes:new Set(),winBy:{},winsBySeason:{},bestSeasonWins:0,
      boots:0,balls:0,sboots:0,sballs:0,doubleGlory:0,seasonBoth:0,awardsN:0,awardSeasons:new Set(),awardFormats:new Set(),bootSeasons:new Set(),ballSeasons:new Set(),bootStreak:0,ballStreak:0,
      bootFmt:{},ballFmt:{},bestBootSeason:0,bestBallSeason:0,dorBest:null,dorWins:0,mgApps:0,mgSeasons:new Set(),mgFinals:0,mgWins:0,mgWinSeasons:new Set(),mgStreak:0,playerT:0,unlocked:{}});
    players.forEach(st);

    // every completed tournament, in order
    const tours=new Map();const key=(s,t)=>s+'|'+t;
    const add=(s,t)=>{const k=key(s,t);if(!tours.has(k))tours.set(k,{s,t,rows:[],tro:[],aw:null});return tours.get(k);};
    (D.log||[]).forEach(r=>add(r[0],r[1]).rows.push(r));
    (D.trophies||[]).forEach(r=>add(r[0],r[1]).tro.push(r));
    (D.awards||[]).forEach(a=>{add(a[0],a[1]).aw=a;});
    const list=[...tours.values()].filter(x=>ORDER.includes(x.t)).sort((a,b)=>a.s-b.s||ORDER.indexOf(a.t)-ORDER.indexOf(b.t));
    const seasonAw={};(D.seasonAwards||[]).forEach(a=>{seasonAw[a[0]]=a;});
    const finalSeason=s=>s<=12||!!seasonAw[s];
    const lastOfSeason={};list.forEach(x=>{lastOfSeason[x.s]=x;});
    const editions=opt.dor||[{label:(D.ballon&&D.ballon.label)||'1st MLD d\'Or',after:12,list:(D.dorNominees&&D.dorNominees.list)||[],winner:D.ballon&&D.ballon.winner}];
    const events=[];

    const check=(label,src)=>{Object.values(S).forEach(x=>{L.forEach(a=>{if(x.unlocked[a.id])return;const [c,t]=a.p(x);if(c>=t)x.unlocked[a.id]={at:label,src,i:events.length};});});};
    const rerank=()=>{const R=Object.values(S).filter(x=>x.apps>0&&x.rN>0).sort((a,b)=>b.cs-a.cs||a.n.localeCompare(b.n));
      R.forEach((x,i)=>{x.rank=i+1;x.bestRank=x.bestRank?Math.min(x.bestRank,i+1):i+1;});};

    list.forEach(T=>{
      const label=`S${T.s} ${TN[T.t]}`;
      // appearances (Co-op too); goals and ratings only outside Co-op
      T.rows.forEach(r=>{const x=st(r[2]);if(!x.tours.has(key(T.s,T.t))){x.tours.add(key(T.s,T.t));x.apps++;}
        if(T.t!=='C'){x.rows++;x.goals+=r[4]||0;if(r[5]!=null){x.rSum+=r[5];x.rN++;}}});
      // Co-op line-ups (data.coop): every listed player who is in the database takes part
      if(T.t==='C')(D.coop||[]).filter(c=>c[0]===T.s).forEach(c=>[c[2],c[3]].forEach(n=>{if(!players.includes(n))return;const x=st(n);
        if(!x.tours.has(key(T.s,T.t))){x.tours.add(key(T.s,T.t));x.apps++;}}));
      // results: winners and runner-ups (Co-op pairs and Team Tour squads included; managers are not players)
      T.tro.forEach(r=>{const x=st(r[2]);
        if(T.t==='C'&&(r[3]==='Player Trophy'||r[3]==='Runner-up')&&!x.tours.has(key(T.s,T.t))){x.tours.add(key(T.s,T.t));x.apps++;} // Co-op players are known from the results
        if(r[3]==='Player Trophy'&&T.t==='T')x.playerT++;
        if(r[3]==='Player Trophy'){x.wins++;x.winTypes.add(T.t);x.winBy[T.t]=(x.winBy[T.t]||0)+1;(x.winsBySeason[T.s]=x.winsBySeason[T.s]||new Set()).add(T.t);}
        else if(r[3]==='Runner-up')x.ru++;});
      // managers (Team Tour only): data.managers rows [season, team, name] when recorded, plus the winning
      // manager from the Manager Trophy records. A manager's team in the final earns 'Final Whistle'.
      if(T.t==='T'){const fin=(D.finals||[]).find(f=>f.s===T.s)||{},M={};
        (D.managers||[]).filter(m=>m[0]===T.s).forEach(m=>{M[m[2]]=M[m[2]]||{team:m[1]};});
        T.tro.filter(r=>r[3]==='Manager Trophy').forEach(r=>{M[r[2]]=Object.assign(M[r[2]]||{},{won:true});});
        (fin.mg||[]).forEach(n=>{M[n]=Object.assign(M[n]||{},{won:true});});
        Object.entries(M).forEach(([n,m])=>{const x=st(n);if(!x.mgSeasons.has(T.s)){x.mgSeasons.add(T.s);x.mgApps++;}
          const won=m.won||(m.team&&m.team===fin.champ),fin2=won||(m.team&&m.team===fin.runner);
          if(fin2)x.mgFinals++;if(won){x.mgWins++;x.mgWinSeasons.add(T.s);x.mgStreak=streak(x.mgWinSeasons);}});}
      // tournament Golden Boot / Golden Ball (never Co-op)
      if(T.aw&&T.t!=='C'){const a=T.aw,bs=names(a[3]),bl=names(a[5]);
        bs.forEach(n=>{const x=st(n);x.boots++;x.awardsN++;x.awardSeasons.add(T.s);x.awardFormats.add(T.t);x.bootSeasons.add(T.s);(x.bootFmt[T.s]=x.bootFmt[T.s]||new Set()).add(T.t);x.bootStreak=streak(x.bootSeasons);});
        bl.forEach(n=>{const x=st(n);x.balls++;x.awardsN++;x.awardSeasons.add(T.s);x.awardFormats.add(T.t);x.ballSeasons.add(T.s);(x.ballFmt[T.s]=x.ballFmt[T.s]||new Set()).add(T.t);x.ballStreak=streak(x.ballSeasons);
          if(bs.includes(n))x.doubleGlory=1;});}
      // all-time rating after this tournament, and the leaderboard position
      Object.values(S).forEach(x=>{x.cs=x.rN?(x.rSum/x.rN)*Math.log(1+x.rows):0; /* same formula as the Top Ratings page */x.csPeak=Math.max(x.csPeak,x.cs);});
      rerank();
      events.push({label,s:T.s,t:T.t});
      check(label,{type:'tournament',s:T.s,t:T.t});
      // season-level achievements wait until the season is final
      if(lastOfSeason[T.s]===T&&finalSeason(T.s)){
        const sa=seasonAw[T.s];
        if(sa){const b=names(sa[3]),g=names(sa[5]);
          b.forEach(n=>{const x=st(n);x.sboots++;x.awardsN++;x.awardSeasons.add(T.s);});
          g.forEach(n=>{const x=st(n);x.sballs++;x.awardsN++;x.awardSeasons.add(T.s);if(b.includes(n))x.seasonBoth=1;});}
        Object.values(S).forEach(x=>{const w=x.winsBySeason[T.s];if(w)x.bestSeasonWins=Math.max(x.bestSeasonWins,w.size);
          if(x.bootFmt[T.s])x.bestBootSeason=Math.max(x.bestBootSeason,FMT3.filter(f=>x.bootFmt[T.s].has(f)).length);
          if(x.ballFmt[T.s])x.bestBallSeason=Math.max(x.bestBallSeason,FMT3.filter(f=>x.ballFmt[T.s].has(f)).length);});
        events.push({label:`Season ${T.s} finalised`,s:T.s,t:'S'});
        check(`Season ${T.s} awards`,{type:'season',s:T.s});
      }
      // MLD d'Or editions are published after their last season
      editions.filter(e=>e.after===T.s&&lastOfSeason[T.s]===T&&finalSeason(T.s)).forEach(e=>{
        (e.list||[]).forEach(r=>{const x=S[r.name];if(!x)return;x.dorBest=x.dorBest?Math.min(x.dorBest,r.rank):r.rank;});
        if(e.winner&&S[e.winner])S[e.winner].dorWins++;
        events.push({label:e.label,s:T.s,t:'DOR'});
        check(e.label,{type:'dor',label:e.label});});
    });

    const res={};Object.values(S).forEach(x=>{
      res[x.n]={state:x,list:L.map(a=>{const [c,t]=a.p(x),u=x.unlocked[a.id];return {a,cur:c,target:t,unlocked:!!u,at:u&&u.at,src:u&&u.src,order:u?u.i:-1};})};});
    const rate={};L.forEach(a=>{rate[a.id]=players.filter(n=>res[n]&&res[n].list.find(z=>z.a.id===a.id).unlocked).length;});
    return {L,RARITY,CATS,CAT_NAME,res,rate,players:players.length,events};
  }
  return {L,RARITY,CATS,CAT_NAME,evaluate};
})();
if(typeof module!=='undefined')module.exports=ACHE;
