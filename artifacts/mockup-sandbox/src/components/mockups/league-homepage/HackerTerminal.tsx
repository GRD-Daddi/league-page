import React, { useEffect, useState } from "react";

export function HackerTerminal() {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black text-[#33ff33] font-mono p-4 md:p-8 relative overflow-hidden flex justify-center selection:bg-[#33ff33] selection:text-black"
         style={{ textShadow: "0 0 4px rgba(51, 255, 51, 0.4)", fontSize: "16px", lineHeight: "1.2" }}>
      {/* Scanlines */}
      <div 
        className="pointer-events-none absolute inset-0 z-50 opacity-15 mix-blend-overlay"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 1px, #000 2px, #000 3px)",
          backgroundSize: "100% 3px"
        }}
      />
      {/* Screen glow vignette */}
      <div className="pointer-events-none absolute inset-0 z-40 opacity-20 shadow-[inset_0_0_100px_rgba(51,255,51,0.2)]" />
      
      <div className="w-full max-w-[1200px] z-10 flex flex-col gap-6">
        {/* Header */}
        <pre className="whitespace-pre text-center font-bold text-lg leading-tight mx-auto hidden sm:block">
{`╔═════════════════════════════════════════════════╗
║         MINNESOTA SLOPES FANTASY LEAGUE         ║
║         SYSTEM ONLINE // WEEK 11 // 2024        ║
╚═════════════════════════════════════════════════╝`}
        </pre>
        <pre className="whitespace-pre text-center font-bold text-sm leading-tight mx-auto block sm:hidden">
{`╔══════════════════════════════════╗
║ MINNESOTA SLOPES FANTASY LEAGUE  ║
║ SYSTEM ONLINE // WEEK 11 // 2024 ║
╚══════════════════════════════════╝`}
        </pre>

        {/* Nav */}
        <div className="flex flex-wrap justify-center gap-4 text-sm uppercase tracking-widest border-b border-[#33ff33] border-dashed pb-4">
          <a href="#" className="hover:text-black hover:bg-[#33ff33] px-1 transition-colors">[HOME]</a>
          <a href="#" className="hover:text-black hover:bg-[#33ff33] px-1 transition-colors">[MATCHUPS]</a>
          <a href="#" className="hover:text-black hover:bg-[#33ff33] px-1 transition-colors">[STANDINGS]</a>
          <a href="#" className="hover:text-black hover:bg-[#33ff33] px-1 transition-colors">[ROSTERS]</a>
          <a href="#" className="hover:text-black hover:bg-[#33ff33] px-1 transition-colors">[TRANSACTIONS]</a>
          <a href="#" className="hover:text-black hover:bg-[#33ff33] px-1 transition-colors">[DRAFTS]</a>
          <a href="#" className="hover:text-black hover:bg-[#33ff33] px-1 transition-colors">[LOGIN]</a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-2">
          {/* Main Column */}
          <div className="flex flex-col gap-6">
            
            {/* Standings */}
            <div>
              <div className="mb-2 uppercase tracking-widest font-bold border-b border-[#33ff33] border-dashed inline-block">
                {'>'} SELECT * FROM Standings
              </div>
              <pre className="text-sm overflow-x-auto mt-2">
{`┌──────────────────────────────────────────────────┐
│ POS │ TEAM NAME         │ W-L │ POINTS   │ STRK  │
├─────┼───────────────────┼─────┼──────────┼───────┤
│  1  │ Purple Reign      │ 8-2 │ 1245.6   │ W4    │
│  2  │ Lake Effect       │ 7-3 │ 1198.2   │ W1    │
│  3  │ Diggs It          │ 6-4 │ 1150.8   │ L1    │
│  4  │ Sled Dogs         │ 6-4 │ 1112.4   │ W2    │
│  5  │ Vikings Funeral   │ 5-5 │ 1089.1   │ L2    │
│  6  │ Tundra FC         │ 4-6 │ 1045.7   │ L4    │
└──────────────────────────────────────────────────┘`}
              </pre>
            </div>

            {/* Status Panel */}
            <div>
              <div className="mb-2 uppercase tracking-widest font-bold border-b border-[#33ff33] border-dashed inline-block">
                {'>'} PING Matchups --live
              </div>
              <div className="mt-2 text-sm flex flex-col gap-2 font-mono">
                <div className="flex justify-between items-center bg-[#0a0a0a] p-2 border border-[#33ff33] border-opacity-30">
                  <span className="w-1/3 text-right">PURPLE REIGN</span>
                  <span className="text-xs text-opacity-70 mx-2">...</span>
                  <span className="font-bold">112.4</span>
                  <span className="mx-2 px-1 bg-[#33ff33] text-black text-xs font-bold">FINAL</span>
                  <span className="font-bold">98.6</span>
                  <span className="text-xs text-opacity-70 mx-2">...</span>
                  <span className="w-1/3">TUNDRA FC</span>
                </div>
                
                <div className="flex justify-between items-center bg-[#0a0a0a] p-2 border border-[#33ff33] border-opacity-30 animate-pulse">
                  <span className="w-1/3 text-right">SLED DOGS</span>
                  <span className="text-xs text-opacity-70 mx-2">...</span>
                  <span className="font-bold">104.2</span>
                  <span className="mx-2 px-1 bg-transparent border border-[#33ff33] text-xs font-bold animate-none">LIVE</span>
                  <span className="font-bold">104.2</span>
                  <span className="text-xs text-opacity-70 mx-2">...</span>
                  <span className="w-1/3">LAKE EFFECT</span>
                </div>

                <div className="flex justify-between items-center bg-[#0a0a0a] p-2 border border-[#33ff33] border-opacity-30">
                  <span className="w-1/3 text-right">DIGGS IT</span>
                  <span className="text-xs text-opacity-70 mx-2">...</span>
                  <span className="font-bold">89.5</span>
                  <span className="mx-2 px-1 bg-[#33ff33] text-black text-xs font-bold">FINAL</span>
                  <span className="font-bold">102.1</span>
                  <span className="text-xs text-opacity-70 mx-2">...</span>
                  <span className="w-1/3">VIKINGS FUNERAL</span>
                </div>
              </div>
            </div>

          </div>

          {/* Secondary Column */}
          <div className="flex flex-col gap-6">
            {/* Live Feed */}
            <div>
              <div className="mb-2 uppercase tracking-widest font-bold border-b border-[#33ff33] border-dashed inline-block">
                {'>'} tail -f /var/log/transactions.log
              </div>
              <div className="mt-2 text-sm font-mono flex flex-col gap-2">
                <div>
                  <span className="opacity-70">[08:42]</span> <span className="font-bold">WAIVER:</span> Purple Reign ADDS J.Jefferson (WR,MIN) bid=$12
                </div>
                <div>
                  <span className="opacity-70">[14:15]</span> <span className="font-bold">TRADE:</span> Sled Dogs ACQUIRES T.Hockenson (TE,MIN)
                </div>
                <div>
                  <span className="opacity-70">[14:15]</span> <span className="font-bold">TRADE:</span> Lake Effect ACQUIRES 2025 2nd Rd Pick
                </div>
                <div>
                  <span className="opacity-70">[19:03]</span> <span className="font-bold">DROP:</span> Tundra FC DROPS K.Cousins (QB,ATL)
                </div>
                <div className="flex">
                  <span className="opacity-70 mr-2">[19:04]</span> 
                  <span className="animate-pulse bg-[#33ff33] w-2.5 h-4 inline-block mt-0.5"></span>
                </div>
              </div>
            </div>

            {/* System Specs */}
            <div className="mt-auto border border-[#33ff33] p-4 text-xs opacity-80 mt-8 hidden lg:block">
              <div>HOST: minnesota-slopes.ff.net</div>
              <div>OS: Unix System V Release 4</div>
              <div>MEM: 640K OK</div>
              <div>CONNECTION: 2400 BAUD</div>
            </div>
          </div>
        </div>

        {/* Footer Status Bar */}
        <div className="mt-12 flex justify-between items-center text-xs border-t border-[#33ff33] border-opacity-50 pt-2 opacity-80">
          <div>DATA SYNC: OK</div>
          <div>SYSTEM UPTIME: {formatUptime(uptime)}</div>
          <div className="hidden sm:block">ROOT ACCESS: GRANTED</div>
        </div>

      </div>
    </div>
  );
}
