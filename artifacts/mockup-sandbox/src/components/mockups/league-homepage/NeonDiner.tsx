import React from "react";
import { Coffee, Utensils, ReceiptText, Trophy, Clock, ChevronRight } from "lucide-react";

export function NeonDiner() {
  return (
    <div className="min-h-screen bg-[#1a1200] text-amber-50 font-sans selection:bg-pink-500/30 overflow-x-hidden relative">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Lobster&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Permanent+Marker&display=swap');
        
        .font-lobster { font-family: 'Lobster', cursive; }
        .font-mono-receipt { font-family: 'Space Mono', monospace; }
        .font-chalk { font-family: 'Permanent Marker', cursive; }
        
        .neon-text-pink {
          color: #ff2a85;
          text-shadow: 0 0 5px #ff2a85, 0 0 10px #ff2a85, 0 0 20px #ff2a85, 0 0 40px #ff2a85;
        }
        
        .neon-text-mint {
          color: #2affb4;
          text-shadow: 0 0 5px #2affb4, 0 0 10px #2affb4, 0 0 20px #2affb4;
        }
        
        .neon-text-amber {
          color: #ffaa00;
          text-shadow: 0 0 5px #ffaa00, 0 0 10px #ffaa00, 0 0 20px #ffaa00;
        }

        .neon-border-pink {
          border-color: #ff2a85;
          box-shadow: 0 0 5px #ff2a85, inset 0 0 5px #ff2a85;
        }

        .checkered-bg {
          background-image: 
            linear-gradient(45deg, rgba(0,0,0,0.4) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.4)),
            linear-gradient(45deg, rgba(0,0,0,0.4) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.4));
          background-size: 60px 60px;
          background-position: 0 0, 30px 30px;
        }

        .chalkboard {
          background-color: #2c3531;
          background-image: radial-gradient(#3c4541 15%, transparent 16%), radial-gradient(#3c4541 15%, transparent 16%);
          background-size: 4px 4px;
          background-position: 0 0, 2px 2px;
          box-shadow: inset 0 0 40px rgba(0,0,0,0.8);
          border: 12px solid #3e2723;
        }

        .receipt-paper {
          background-color: #f4f1ea;
          color: #2b2b2b;
          background-image: linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px);
          background-size: 100% 24px;
          box-shadow: 2px 4px 10px rgba(0,0,0,0.5);
          position: relative;
        }
        
        .receipt-edge {
          background-image: linear-gradient(135deg, transparent 50%, #f4f1ea 50%), linear-gradient(45deg, #f4f1ea 50%, transparent 50%);
          background-position: bottom left, bottom left;
          background-size: 16px 16px;
          background-repeat: repeat-x;
          height: 16px;
          width: 100%;
          position: absolute;
          bottom: -16px;
          left: 0;
        }
      `}} />

      {/* Dim ambient lighting overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,#ffaa0015_0%,#000000_80%)] z-0 mix-blend-multiply"></div>
      
      {/* Floor texture */}
      <div className="fixed inset-x-0 bottom-0 h-64 pointer-events-none checkered-bg opacity-30 z-0 transform perspective-[1000px] rotateX-[60deg] origin-bottom scale-x-150"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-screen">
        
        {/* Header / Neon Sign */}
        <header className="flex flex-col md:flex-row items-center justify-between mb-12 border-b border-amber-900/50 pb-6">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <h1 className="font-lobster text-6xl md:text-7xl neon-text-pink tracking-wide transform -rotate-2">
              Minnesota Slopes
            </h1>
            <div className="font-mono-receipt text-amber-200/70 uppercase tracking-widest text-sm mt-2 ml-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Open 24 Hours • Week 11 • 2024
            </div>
          </div>

          <nav className="flex flex-wrap justify-center gap-4 md:gap-6 font-lobster text-xl">
            <a href="#" className="text-amber-100 hover:neon-text-amber transition-all duration-300">Home</a>
            <a href="#" className="text-amber-100 hover:neon-text-amber transition-all duration-300">Matchups</a>
            <a href="#" className="text-amber-100 hover:neon-text-amber transition-all duration-300">Standings</a>
            <a href="#" className="text-amber-100 hover:neon-text-amber transition-all duration-300">Rosters</a>
            <a href="#" className="text-amber-100 hover:neon-text-amber transition-all duration-300">Transactions</a>
            <a href="#" className="text-amber-100 hover:neon-text-amber transition-all duration-300">Drafts</a>
            <a href="#" className="text-amber-100 hover:neon-text-amber transition-all duration-300">History</a>
            <a href="#" className="border-2 border-pink-500 text-pink-500 hover:neon-text-pink hover:neon-border-pink px-4 py-1 rounded-full transition-all duration-300 ml-2">Login</a>
          </nav>
        </header>

        <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Column: Chalkboard Standings & Specials */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Specials Board (Top Stats) */}
            <div className="bg-[#4a2e15] border-4 border-[#2a1708] p-6 rounded shadow-2xl relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1a1200] px-4 font-lobster text-2xl neon-text-mint">
                Today's Specials
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 text-center">
                <div>
                  <div className="text-amber-500 uppercase text-xs tracking-wider mb-1">League Leader</div>
                  <div className="font-lobster text-2xl text-white">Purple Reign</div>
                  <div className="font-mono-receipt text-amber-200/60 text-sm mt-1">8-2 Record</div>
                </div>
                <div className="border-y md:border-y-0 md:border-x border-amber-900/30 py-4 md:py-0">
                  <div className="text-amber-500 uppercase text-xs tracking-wider mb-1">Top Scorer</div>
                  <div className="font-lobster text-2xl text-white">J. Jefferson</div>
                  <div className="font-mono-receipt text-amber-200/60 text-sm mt-1">34.2 pts</div>
                </div>
                <div>
                  <div className="text-amber-500 uppercase text-xs tracking-wider mb-1">Hot Streak</div>
                  <div className="font-lobster text-2xl text-white">Lake Effect</div>
                  <div className="font-mono-receipt text-amber-200/60 text-sm mt-1">4 Wins</div>
                </div>
              </div>
            </div>

            {/* Standings Chalkboard */}
            <div className="chalkboard p-8 rounded-sm transform rotate-1 relative group">
              {/* Eraser dust effect */}
              <div className="absolute bottom-2 right-4 w-32 h-8 bg-white/5 blur-xl rounded-full"></div>
              
              <h2 className="font-chalk text-4xl text-white/90 text-center mb-8 flex justify-center items-center gap-3">
                <Trophy className="w-8 h-8 opacity-80" strokeWidth={2.5} />
                League Standings
                <span className="text-2xl opacity-60 ml-2">(W11)</span>
              </h2>

              <div className="space-y-4 font-chalk text-xl tracking-wide text-white/80">
                <div className="flex justify-between items-end border-b border-white/20 pb-2">
                  <span className="text-2xl text-white">1. Purple Reign</span>
                  <span className="font-mono-receipt text-lg">8-2 (1245.6)</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/20 pb-2 pl-4">
                  <span>2. Lake Effect</span>
                  <span className="font-mono-receipt text-lg">7-3</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/10 pb-2 pl-4">
                  <span>3. Diggs It</span>
                  <span className="font-mono-receipt text-lg">6-4</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/10 pb-2 pl-4">
                  <span>4. Sled Dogs</span>
                  <span className="font-mono-receipt text-lg">6-4</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/10 pb-2 pl-4 opacity-70">
                  <span>5. Vikings Funeral</span>
                  <span className="font-mono-receipt text-lg">5-5</span>
                </div>
                <div className="flex justify-between items-end pb-2 pl-4 opacity-50">
                  <span>6. Tundra FC</span>
                  <span className="font-mono-receipt text-lg">4-6</span>
                </div>
              </div>
            </div>

            {/* Matchups Pie Case Cards */}
            <div>
              <h2 className="font-lobster text-3xl neon-text-amber mb-6">Fresh from the Oven (Matchups)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Matchup Card 1 */}
                <div className="bg-[#fffdf8] text-slate-800 p-1 rounded-sm shadow-xl transform -rotate-2 hover:rotate-0 transition-transform">
                  <div className="border-2 border-red-800/20 p-4 h-full flex flex-col">
                    <div className="text-center font-bold text-red-800 tracking-widest text-xs mb-3 border-b-2 border-red-800/10 pb-2">FINAL</div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-lobster text-xl">Purple Reign</span>
                      <span className="font-mono-receipt font-bold text-lg">112.4</span>
                    </div>
                    <div className="flex justify-between items-center opacity-60">
                      <span className="font-lobster text-xl">Tundra FC</span>
                      <span className="font-mono-receipt font-bold text-lg">98.6</span>
                    </div>
                  </div>
                </div>

                {/* Matchup Card 2 (LIVE) */}
                <div className="bg-[#fffdf8] text-slate-800 p-1 rounded-sm shadow-xl scale-105 z-10 border-b-4 border-r-4 border-amber-900/50">
                  <div className="border-2 border-green-800/30 bg-green-50/30 p-4 h-full flex flex-col">
                    <div className="text-center font-bold text-green-700 tracking-widest text-xs mb-3 border-b-2 border-green-800/10 pb-2 flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> LIVE
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-lobster text-xl">Sled Dogs</span>
                      <span className="font-mono-receipt font-bold text-lg">104.2</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-lobster text-xl">Lake Effect</span>
                      <span className="font-mono-receipt font-bold text-lg">104.2</span>
                    </div>
                  </div>
                </div>

                {/* Matchup Card 3 */}
                <div className="bg-[#fffdf8] text-slate-800 p-1 rounded-sm shadow-xl transform rotate-2 hover:rotate-0 transition-transform">
                  <div className="border-2 border-red-800/20 p-4 h-full flex flex-col">
                    <div className="text-center font-bold text-red-800 tracking-widest text-xs mb-3 border-b-2 border-red-800/10 pb-2">FINAL</div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-lobster text-xl opacity-60">Diggs It</span>
                      <span className="font-mono-receipt font-bold text-lg opacity-60">89.5</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-lobster text-xl">Vikings Fun.</span>
                      <span className="font-mono-receipt font-bold text-lg">102.1</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: Receipt Transactions */}
          <div className="lg:col-span-4 relative mt-12 lg:mt-0">
            {/* Receipt Spindle */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-4 h-16 bg-gradient-to-r from-gray-400 via-gray-200 to-gray-500 rounded-t-full shadow-lg z-20"></div>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-12 h-2 bg-gradient-to-r from-gray-500 via-gray-300 to-gray-600 rounded-full z-10"></div>
            
            <div className="receipt-paper pt-8 pb-12 px-6 font-mono-receipt text-sm transform -rotate-1 origin-top mx-auto max-w-sm mb-8">
              <div className="text-center mb-6">
                <div className="font-bold text-xl mb-1">MINNESOTA SLOPES</div>
                <div className="text-xs text-gray-500 uppercase tracking-widest">Transaction Log</div>
                <div className="text-xs text-gray-400 mt-2">SERVER: COMMISH</div>
                <div className="text-xs text-gray-400">TABLE: WAIVERS</div>
                <div className="border-b-2 border-dashed border-gray-300 my-4"></div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between">
                    <span>1x J. Jefferson</span>
                    <span>ADD</span>
                  </div>
                  <div className="text-xs text-gray-500">By: Purple Reign</div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-500">
                    <span>1x A. Mattison</span>
                    <span>DROP</span>
                  </div>
                </div>

                <div className="border-b border-dotted border-gray-300 my-2"></div>

                <div>
                  <div className="flex justify-between">
                    <span>1x T. Chandler</span>
                    <span>$12.00</span>
                  </div>
                  <div className="text-xs text-gray-500">Waiver Claim</div>
                </div>

                <div className="border-b border-dotted border-gray-300 my-2"></div>

                <div>
                  <div className="flex justify-between text-gray-500">
                    <span>1x K. Cousins</span>
                    <span>DROP</span>
                  </div>
                  <div className="text-xs text-gray-500">By: Sled Dogs</div>
                </div>
              </div>

              <div className="border-b-2 border-dashed border-gray-300 my-6"></div>
              
              <div className="text-center text-xs text-gray-500 space-y-1">
                <div>THANK YOU FOR PLAYING</div>
                <div>PLEASE COME AGAIN</div>
                <div className="mt-4">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
              </div>

              <div className="receipt-edge"></div>
            </div>
            
            <button className="w-full mt-12 bg-pink-600 hover:bg-pink-500 text-white font-mono-receipt font-bold py-4 px-6 shadow-[0_0_15px_rgba(255,42,133,0.5)] transition-colors flex items-center justify-between">
              <span>VIEW ALL TRANSACTIONS</span>
              <ChevronRight className="w-5 h-5" />
            </button>

          </div>
        </main>
        
        <footer className="mt-16 pt-8 border-t border-amber-900/30 text-center font-mono-receipt text-amber-600/50 text-xs pb-4">
          <p>© 2024 Minnesota Slopes Fantasy League. Open 24/7 during football season.</p>
        </footer>
      </div>
    </div>
  );
}
