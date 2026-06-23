import React, { useEffect } from 'react';
import { Swords, Shield, Crown, Scroll, Flame, Skull, ChevronRight, Crosshair, Dagger, Castle } from 'lucide-react';

export function DungeonMap() {
  useEffect(() => {
    // Add Google Fonts for Cinzel and a clean serif
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-[#a8b5c0] font-['EB_Garamond',_serif] relative selection:bg-[#a31515] selection:text-[#c8a96e] overflow-x-hidden text-lg">
      
      {/* Dynamic styles for ornamental features */}
      <style dangerouslySetInnerHTML={{ __html: `
        .font-cinzel { font-family: 'Cinzel', serif; }
        .bg-stone-texture { background-color: #0d0d0f; background-image: radial-gradient(circle at center, #1a1a1c 0%, #0d0d0f 100%); }
        
        .ornate-border {
          position: relative;
        }
        .ornate-border::before, .ornate-border::after {
          content: '✧';
          position: absolute;
          color: #c8a96e;
          font-size: 14px;
        }
        .ornate-border::before { left: -20px; top: 50%; transform: translateY(-50%); }
        .ornate-border::after { right: -20px; top: 50%; transform: translateY(-50%); }

        .parchment {
          background-color: #dfd3bb;
          background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E");
          box-shadow: inset 0 0 40px rgba(89, 74, 53, 0.4), 0 10px 30px rgba(0,0,0,0.8);
        }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* Background image overlay */}
      <div
        className="fixed inset-0 z-0 opacity-15 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/__mockup/images/dark-tavern.png")' }}
      />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        
        {/* Navigation */}
        <nav className="flex items-center justify-between py-6 border-b border-[#c8a96e]/20 mb-12">
          <div className="flex gap-8 font-cinzel text-sm tracking-widest text-[#a8b5c0]">
            <a href="#" className="hover:text-[#c8a96e] transition-colors flex items-center gap-2"><Castle size={16}/> HOME</a>
            <a href="#" className="hover:text-[#c8a96e] transition-colors">BATTLES</a>
            <a href="#" className="hover:text-[#c8a96e] transition-colors">RANKINGS</a>
            <a href="#" className="hover:text-[#c8a96e] transition-colors">GUILDS</a>
            <a href="#" className="hover:text-[#c8a96e] transition-colors">CHRONICLES</a>
            <a href="#" className="hover:text-[#c8a96e] transition-colors">ANNALS</a>
            <a href="#" className="hover:text-[#c8a96e] transition-colors">LORE</a>
          </div>
          <a href="#" className="font-cinzel text-sm tracking-widest text-[#0d0d0f] bg-[#c8a96e] px-6 py-2 hover:bg-[#d8bd88] transition-colors border border-[#e3ce9c] shadow-[0_0_15px_rgba(200,169,110,0.2)]">
            [ ENTER THE REALM ]
          </a>
        </nav>

        {/* Hero Banner */}
        <div className="text-center mb-16">
          <div className="inline-flex flex-col items-center">
            <h2 className="text-[#a8b5c0] font-cinzel tracking-[0.3em] text-sm mb-4 uppercase flex items-center gap-4">
              <span className="w-12 h-px bg-[#c8a96e]/50"></span>
              Season XI — The 2024 Campaign
              <span className="w-12 h-px bg-[#c8a96e]/50"></span>
            </h2>
            <h1 className="text-6xl md:text-7xl font-cinzel font-bold text-[#c8a96e] mb-6 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] tracking-wide">
              MINNESOTA SLOPES
            </h1>
            <div className="text-[#a31515] font-cinzel tracking-widest text-xl ornate-border">
              Battle Week 11 of 17
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Battles (Matchups) - 4 cols */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Swords className="text-[#c8a96e]" size={24} />
              <h3 className="font-cinzel text-2xl text-[#c8a96e] tracking-widest">Battles</h3>
              <div className="flex-grow h-px bg-gradient-to-r from-[#c8a96e]/40 to-transparent"></div>
            </div>

            <div className="space-y-4">
              {/* Battle 1 */}
              <div className="bg-[#121214] border border-[#c8a96e]/20 p-5 relative overflow-hidden group hover:border-[#c8a96e]/40 transition-colors">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#c8a96e]/30 to-transparent"></div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-cinzel tracking-wider text-[#a8b5c0]/70 uppercase">Concluded</span>
                  <span className="text-[#a31515]"><Skull size={14} /></span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-cinzel text-[#c8a96e] font-bold">Purple Reign</span>
                    <span className="font-serif text-[#c8a96e] font-bold text-xl">112.4</span>
                  </div>
                  <div className="flex items-center justify-center py-1">
                    <span className="text-[#a8b5c0]/30 text-xs font-cinzel">def.</span>
                  </div>
                  <div className="flex justify-between items-center opacity-60">
                    <span className="font-cinzel">Tundra FC</span>
                    <span className="font-serif text-lg">98.6</span>
                  </div>
                </div>
              </div>

              {/* Battle 2 */}
              <div className="bg-[#161412] border border-[#c8a96e]/40 p-5 relative overflow-hidden shadow-[0_0_20px_rgba(200,169,110,0.05)]">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#c8a96e]/10 to-transparent pointer-events-none"></div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-cinzel tracking-wider text-[#c8a96e] uppercase animate-pulse">In Progress</span>
                  <span className="text-[#c8a96e]"><Flame size={14} /></span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-cinzel text-white">Sled Dogs</span>
                    <span className="font-serif text-white font-bold text-xl">104.2</span>
                  </div>
                  <div className="flex items-center justify-center py-1 relative">
                    <div className="absolute w-full h-px bg-[#c8a96e]/20 top-1/2"></div>
                    <span className="bg-[#161412] px-2 text-[#a31515] relative z-10"><Swords size={16}/></span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-cinzel text-white">Lake Effect</span>
                    <span className="font-serif text-white font-bold text-xl">104.2</span>
                  </div>
                </div>
              </div>

              {/* Battle 3 */}
              <div className="bg-[#121214] border border-[#c8a96e]/20 p-5 relative overflow-hidden group hover:border-[#c8a96e]/40 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-cinzel tracking-wider text-[#a8b5c0]/70 uppercase">Concluded</span>
                  <span className="text-[#a31515]"><Skull size={14} /></span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center opacity-60">
                    <span className="font-cinzel">Diggs It</span>
                    <span className="font-serif text-lg">89.5</span>
                  </div>
                  <div className="flex items-center justify-center py-1">
                    <span className="text-[#a8b5c0]/30 text-xs font-cinzel">def by.</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-cinzel text-[#c8a96e] font-bold">Vikings Funeral</span>
                    <span className="font-serif text-[#c8a96e] font-bold text-xl">102.1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: Standings (Parchment Scroll) - 5 cols */}
          <div className="lg:col-span-5 relative">
            <div className="parchment rounded-sm p-8 text-[#2b241d] relative h-full">
              {/* Decorative Scroll Elements */}
              <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-[#bda682] to-transparent rounded-t-sm opacity-50"></div>
              <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-[#bda682] to-transparent rounded-b-sm opacity-50"></div>
              
              <div className="text-center mb-8 relative">
                <h3 className="font-cinzel text-3xl font-bold tracking-widest text-[#1a140f]">Guild Rankings</h3>
                <div className="flex justify-center mt-3">
                  <span className="text-[#8b0000]">❧ ───────── ✦ ───────── ☙</span>
                </div>
              </div>

              <div className="space-y-1">
                {[
                  { rank: "I", name: "Purple Reign", record: "8-2", pts: "1245.6", icon: Crown, highlight: true },
                  { rank: "II", name: "Lake Effect", record: "7-3", pts: "1189.2", icon: Shield },
                  { rank: "III", name: "Diggs It", record: "6-4", pts: "1140.5", icon: Crosshair },
                  { rank: "IV", name: "Sled Dogs", record: "6-4", pts: "1138.1", icon: Swords },
                  { rank: "V", name: "Vikings Funeral", record: "5-5", pts: "1098.4", icon: null },
                  { rank: "VI", name: "Tundra FC", record: "4-6", pts: "1012.7", icon: null },
                ].map((team, idx) => (
                  <div key={idx} className={`flex items-center py-4 border-b border-[#8b4513]/20 ${team.highlight ? 'bg-[#d2c2a0]/40 -mx-4 px-4 rounded-sm' : ''}`}>
                    <div className="w-12 text-center font-cinzel font-bold text-lg text-[#5c4a3d]">{team.rank}</div>
                    <div className="flex-grow flex items-center gap-3">
                      <span className={`font-cinzel font-bold text-xl ${team.highlight ? 'text-[#8b0000]' : 'text-[#2b241d]'}`}>
                        {team.name}
                      </span>
                      {team.icon && <team.icon size={16} className={team.highlight ? 'text-[#8b0000]' : 'text-[#8b4513]'} />}
                    </div>
                    <div className="text-right">
                      <div className="font-cinzel font-bold text-[#2b241d]">{team.record}</div>
                      <div className="text-sm font-serif italic text-[#5c4a3d]">{team.pts} pts</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <a href="#" className="inline-flex items-center gap-2 font-cinzel text-sm tracking-widest text-[#8b0000] hover:text-[#a31515] transition-colors font-bold border-b border-transparent hover:border-[#8b0000]">
                  View Full Ledger <ChevronRight size={16} />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Transactions (Chronicle) - 3 cols */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Scroll className="text-[#c8a96e]" size={24} />
              <h3 className="font-cinzel text-2xl text-[#c8a96e] tracking-widest">Chronicle</h3>
            </div>

            <div className="relative pl-6 border-l-2 border-[#1f1f23]">
              <div className="space-y-8">
                
                {/* Event 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#0d0d0f] border-2 border-[#c8a96e]"></div>
                  <div className="text-xs font-cinzel tracking-wider text-[#a8b5c0]/50 mb-1">2 Dawns Ago</div>
                  <div className="bg-[#121214] border border-[#c8a96e]/10 p-4 leading-relaxed text-[#d4d4d8]">
                    <span className="text-[#c8a96e] font-cinzel font-bold">Purple Reign</span> hath acquired the services of mercenary <span className="italic text-white">J. Jefferson</span> from the waiver plains, banishing <span className="italic text-[#a8b5c0]">K. Osborn</span> to the void.
                  </div>
                </div>

                {/* Event 2 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#0d0d0f] border-2 border-[#8b0000]"></div>
                  <div className="text-xs font-cinzel tracking-wider text-[#a8b5c0]/50 mb-1">3 Dawns Ago</div>
                  <div className="bg-[#121214] border border-[#c8a96e]/10 p-4 leading-relaxed text-[#d4d4d8]">
                    A blood pact was struck! <span className="text-[#c8a96e] font-cinzel font-bold">Lake Effect</span> exchanges <span className="italic text-white">D. Swift</span> and gold for the allegiance of <span className="italic text-white">A. St. Brown</span> from <span className="text-[#c8a96e] font-cinzel font-bold">Diggs It</span>.
                  </div>
                </div>

                {/* Event 3 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#0d0d0f] border-2 border-[#404040]"></div>
                  <div className="text-xs font-cinzel tracking-wider text-[#a8b5c0]/50 mb-1">4 Dawns Ago</div>
                  <div className="bg-[#121214] border border-[#c8a96e]/10 p-4 leading-relaxed text-[#d4d4d8]">
                    The infirmary welcomes <span className="italic text-[#a31515]">M. Andrews</span>, struck down in battle. <span className="text-[#c8a96e] font-cinzel font-bold">Tundra FC</span> hastily summons reinforcements.
                  </div>
                </div>

                {/* Event 4 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#0d0d0f] border-2 border-[#c8a96e]"></div>
                  <div className="text-xs font-cinzel tracking-wider text-[#a8b5c0]/50 mb-1">5 Dawns Ago</div>
                  <div className="bg-[#121214] border border-[#c8a96e]/10 p-4 leading-relaxed text-[#d4d4d8]">
                    <span className="text-[#c8a96e] font-cinzel font-bold">Sled Dogs</span> claims the free agent <span className="italic text-white">Z. Charbonnet</span>, spending 24 pieces of FAAB gold.
                  </div>
                </div>

              </div>
            </div>
            
            <div className="pt-4 text-center">
               <a href="#" className="font-cinzel text-sm text-[#a8b5c0] hover:text-[#c8a96e] transition-colors">
                  Read Older Scrolls
               </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DungeonMap;
