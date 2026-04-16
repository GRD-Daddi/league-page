import React from "react";

import { Button } from "@/components/ui/button";

export function SummitClub() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-secondary selection:text-secondary-foreground">
      {/* Top Bar / Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center font-serif text-xl font-bold rounded-sm group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                M
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-xl leading-none tracking-tight">Minnesota Slopes</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">Est. 2018</span>
              </div>
            </a>

            <nav className="hidden md:flex items-center gap-8">
              {['Home', 'Matchups', 'Standings', 'Rosters', 'Transactions', 'Drafts', 'History'].map((item) => (
                <a 
                  key={item} 
                  href={`/${item.toLowerCase()}`}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[1px] after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" className="font-serif italic bg-transparent border-primary/20 hover:bg-primary hover:text-primary-foreground">
              Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 border-b border-border bg-card">
        {/* Subtle texture/pattern background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}>
        </div>
        
        <div className="max-w-[1280px] mx-auto px-6 relative z-10 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/20 text-secondary-foreground text-xs font-semibold uppercase tracking-widest rounded-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                Week 11 • 2024 Season
              </div>
              <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight">
                The Frozen <br/><span className="text-primary italic">Tundra.</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg font-serif italic">
                A gentleman's pursuit of fantasy glory amidst the unforgiving northern winters.
              </p>
            </div>
            
            <div className="flex gap-4">
              <Button size="lg" className="font-serif text-lg px-8 rounded-none">View Matchups</Button>
              <Button size="lg" variant="outline" className="font-serif text-lg px-8 rounded-none border-primary/20">Read the Ledger</Button>
            </div>
          </div>
          
          <div className="flex-1 w-full relative">
            <div className="aspect-[4/3] bg-muted relative border-4 border-background shadow-xl overflow-hidden group">
              <img 
                src="/__mockup/images/vintage-football.png" 
                alt="Vintage football" 
                className="absolute inset-0 w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700"
              />
              {/* Photo corners effect */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-background/50"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-background/50"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-background/50"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-background/50"></div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-6 -left-6 w-32 h-32 border border-primary/10 rounded-full -z-10"></div>
            <div className="absolute -top-6 -right-6 w-48 h-48 border border-secondary/20 rounded-full -z-10"></div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="py-20">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Standings */}
          <div className="lg:col-span-8 space-y-12">
            <div>
              <div className="flex items-end justify-between mb-8 border-b-2 border-primary pb-4">
                <div>
                  <h2 className="font-serif text-3xl font-bold">The Ledger</h2>
                  <p className="text-muted-foreground font-serif italic mt-1">Current standings as of Week 11</p>
                </div>
                <a href="/standings" className="text-sm font-bold uppercase tracking-wider hover:text-secondary transition-colors">
                  View Full →
                </a>
              </div>

              <div className="bg-card border border-border shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="py-4 px-6 font-semibold text-xs uppercase tracking-widest text-muted-foreground w-12">Rk</th>
                      <th className="py-4 px-6 font-semibold text-xs uppercase tracking-widest text-muted-foreground">Club</th>
                      <th className="py-4 px-6 font-semibold text-xs uppercase tracking-widest text-muted-foreground text-right">W-L-T</th>
                      <th className="py-4 px-6 font-semibold text-xs uppercase tracking-widest text-muted-foreground text-right">PF</th>
                      <th className="py-4 px-6 font-semibold text-xs uppercase tracking-widest text-muted-foreground text-right hidden sm:table-cell">PA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { rank: 1, name: "Purple Reign", record: "8-2-0", pf: "1,245.50", pa: "980.20", trend: "up" },
                      { rank: 2, name: "Diggs It", record: "7-3-0", pf: "1,180.10", pa: "1,050.40", trend: "up" },
                      { rank: 3, name: "Lake Effect", record: "6-4-0", pf: "1,120.80", pa: "1,100.00", trend: "same" },
                      { rank: 4, name: "Sled Dogs", record: "5-5-0", pf: "1,095.30", pa: "1,150.80", trend: "down" },
                      { rank: 5, name: "Tundra FC", record: "4-6-0", pf: "1,010.40", pa: "1,120.50", trend: "down" },
                      { rank: 6, name: "Vikings Funeral", record: "2-8-0", pf: "890.60", pa: "1,240.90", trend: "same" },
                    ].map((team, idx) => (
                      <tr key={team.name} className="hover:bg-muted/20 transition-colors group">
                        <td className="py-4 px-6 text-muted-foreground font-mono text-sm">{team.rank}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center font-serif font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {team.name.charAt(0)}
                            </div>
                            <span className="font-serif font-semibold text-lg">{team.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-medium">{team.record}</td>
                        <td className="py-4 px-6 text-right font-mono text-sm">{team.pf}</td>
                        <td className="py-4 px-6 text-right font-mono text-sm text-muted-foreground hidden sm:table-cell">{team.pa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Matchup Teaser */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-border bg-card p-6 relative overflow-hidden group hover:border-primary/30 transition-colors cursor-pointer">
                <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-semibold">Marquee Matchup</div>
                <div className="flex justify-between items-center">
                  <div className="text-center">
                    <div className="font-serif font-bold text-xl mb-1">Purple Reign</div>
                    <div className="font-mono text-sm text-muted-foreground">8-2-0</div>
                    <div className="text-2xl font-bold mt-2">124.5</div>
                  </div>
                  <div className="font-serif italic text-muted-foreground text-sm">vs</div>
                  <div className="text-center">
                    <div className="font-serif font-bold text-xl mb-1">Diggs It</div>
                    <div className="font-mono text-sm text-muted-foreground">7-3-0</div>
                    <div className="text-2xl font-bold mt-2">118.2</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Transactions & Activity */}
          <div className="lg:col-span-4 space-y-8">
            <div className="border border-border bg-card p-8">
              <h3 className="font-serif text-2xl font-bold border-b border-border pb-4 mb-6">Recent Dispatches</h3>
              
              <div className="space-y-6">
                {[
                  {
                    team: "Lake Effect",
                    action: "Claimed",
                    player: "Ty Chandler",
                    pos: "RB - MIN",
                    drop: "Alexander Mattison",
                    time: "2 hours ago"
                  },
                  {
                    team: "Tundra FC",
                    action: "Traded",
                    player: "T.J. Hockenson",
                    pos: "TE - MIN",
                    drop: "Draft Pick '25 (Rd 2)",
                    time: "Yesterday"
                  },
                  {
                    team: "Vikings Funeral",
                    action: "Dropped",
                    player: "Kirk Cousins",
                    pos: "QB - ATL",
                    drop: null,
                    time: "2 days ago"
                  }
                ].map((tx, idx) => (
                  <div key={idx} className="relative pl-6 pb-6 border-l border-border last:border-0 last:pb-0">
                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-background border-2 border-primary"></div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">{tx.time}</div>
                    <div className="font-serif font-semibold text-lg mb-1">{tx.team}</div>
                    <div className="text-sm">
                      <span className="font-medium text-primary">{tx.action}</span> <span className="font-bold">{tx.player}</span> <span className="text-muted-foreground">({tx.pos})</span>
                    </div>
                    {tx.drop && (
                      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <span className="w-3 h-[1px] bg-muted-foreground/50 inline-block"></span>
                        Dropped {tx.drop}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <Button variant="outline" className="w-full mt-8 font-serif italic border-primary/20">
                View All Transactions
              </Button>
            </div>
            
            <div className="bg-primary text-primary-foreground p-8 text-center border-t-4 border-secondary">
              <h3 className="font-serif text-2xl font-bold mb-4">The Commissioner's Note</h3>
              <p className="font-serif italic opacity-80 text-sm leading-relaxed mb-6">
                "As the frost sets in, true champions are forged. Trade deadline approaches at the end of Week 12. Mind your rosters, gentlemen."
              </p>
              <div className="text-xs uppercase tracking-widest font-semibold text-secondary">
                — Commish
              </div>
            </div>
          </div>
          
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-16 border-t-8 border-primary">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-background text-foreground flex items-center justify-center font-serif text-lg font-bold rounded-sm">
                M
              </div>
              <span className="font-serif font-bold text-xl tracking-tight">Minnesota Slopes</span>
            </div>
            <p className="text-background/60 font-serif italic max-w-sm text-sm">
              Established 2018. A premier fantasy football organization dedicated to sportsmanship, competition, and enduring the long winters.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs text-secondary mb-6">Navigation</h4>
            <ul className="space-y-3 text-sm text-background/80">
              <li><a href="/home" className="hover:text-background transition-colors">Home</a></li>
              <li><a href="/standings" className="hover:text-background transition-colors">The Ledger</a></li>
              <li><a href="/matchups" className="hover:text-background transition-colors">Matchups</a></li>
              <li><a href="/history" className="hover:text-background transition-colors">Archives</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs text-secondary mb-6">Resources</h4>
            <ul className="space-y-3 text-sm text-background/80">
              <li><a href="/constitution" className="hover:text-background transition-colors">League Constitution</a></li>
              <li><a href="/rules" className="hover:text-background transition-colors">Scoring Rules</a></li>
              <li><a href="/payouts" className="hover:text-background transition-colors">Payout Structure</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-[1280px] mx-auto px-6 mt-16 pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-background/40">
          <p>© {new Date().getFullYear()} Minnesota Slopes Fantasy League. All rights reserved.</p>
          <p className="font-serif italic">In victory, magnanimity. In defeat, resilience.</p>
        </div>
      </footer>
    </div>
  );
}
