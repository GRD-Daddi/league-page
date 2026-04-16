import React from "react";
import { 
  BarChart3, 
  Activity, 
  Trophy, 
  ArrowRightLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const STANDINGS = [
  { rank: 1, team: "Purple Reign", manager: "J. Smith", w: 8, l: 2, t: 0, pf: 1245.6, pa: 1012.4, streak: "W4" },
  { rank: 2, team: "Tundra FC", manager: "M. Johnson", w: 7, l: 3, t: 0, pf: 1198.2, pa: 1056.8, streak: "W1" },
  { rank: 3, team: "Sled Dogs", manager: "A. Davis", w: 6, l: 4, t: 0, pf: 1102.5, pa: 1110.2, streak: "L1" },
  { rank: 4, team: "Lake Effect", manager: "C. Wilson", w: 5, l: 5, t: 0, pf: 1089.4, pa: 1089.4, streak: "W2" },
  { rank: 5, team: "Diggs It", manager: "T. Brown", w: 4, l: 6, t: 0, pf: 1045.1, pa: 1150.7, streak: "L3" },
  { rank: 6, team: "Vikings Funeral", manager: "R. Miller", w: 2, l: 8, t: 0, pf: 956.8, pa: 1218.1, streak: "L5" },
];

const TRANSACTIONS = [
  { id: 1, type: "Waiver", team: "Purple Reign", playerAdd: "T. Chandler (RB, MIN)", playerDrop: "A. Mattison (RB, LVR)", date: "Nov 12, 08:42 AM", bid: "$12" },
  { id: 2, type: "Trade", team: "Sled Dogs", playerAdd: "J. Jefferson (WR, MIN)", playerDrop: "Multiple Players", date: "Nov 11, 14:15 PM", bid: "-" },
  { id: 3, type: "Free Agent", team: "Lake Effect", playerAdd: "MIN Defense", playerDrop: "CHI Defense", date: "Nov 10, 09:05 AM", bid: "-" },
  { id: 4, type: "Waiver", team: "Diggs It", playerAdd: "J. Dobbs (QB, SF)", playerDrop: "K. Cousins (QB, ATL)", date: "Nov 09, 08:31 AM", bid: "$5" },
];

const MATCHUPS = [
  { away: "Purple Reign", awayScore: 112.4, home: "Tundra FC", homeScore: 98.6, status: "Final" },
  { away: "Sled Dogs", awayScore: 104.2, home: "Lake Effect", homeScore: 104.2, status: "Live" },
  { away: "Diggs It", awayScore: 89.5, home: "Vikings Funeral", homeScore: 102.1, status: "Final" },
];

export function DashboardWire() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <a href="#" className="flex items-center gap-2 font-mono font-bold tracking-tighter text-lg uppercase">
              <div className="size-6 bg-primary flex items-center justify-center text-primary-foreground">
                M
              </div>
              <span>Minnesota Slopes</span>
            </a>
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <a href="#" className="px-3 py-2 text-primary border-b-2 border-primary">Home</a>
              <a href="#" className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">Matchups</a>
              <a href="#" className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">Standings</a>
              <a href="#" className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">Rosters</a>
              <a href="#" className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">Transactions</a>
              <a href="#" className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">Drafts</a>
              <a href="#" className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">History</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="hidden md:flex font-mono uppercase tracking-wider text-xs rounded-none border-border hover:bg-muted">
              Login
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden rounded-none" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-muted/50 px-4 py-4 space-y-2">
          <a href="#" className="block px-3 py-2 text-sm font-medium text-primary">Home</a>
          <a href="#" className="block px-3 py-2 text-sm font-medium text-muted-foreground">Matchups</a>
          <a href="#" className="block px-3 py-2 text-sm font-medium text-muted-foreground">Standings</a>
          <a href="#" className="block px-3 py-2 text-sm font-medium text-muted-foreground">Rosters</a>
          <a href="#" className="block px-3 py-2 text-sm font-medium text-muted-foreground">Transactions</a>
          <Button variant="outline" className="w-full mt-4 font-mono uppercase tracking-wider text-xs rounded-none">Login</Button>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Section */}
        <section className="relative border border-border bg-card overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30"></div>
          <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-primary">
                <Badge variant="outline" className="rounded-none border-primary text-primary bg-primary/10">Active Season</Badge>
                <span>2024 Campaign</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Week 11 <span className="text-muted-foreground font-light">Overview</span>
              </h1>
              <p className="text-muted-foreground max-w-xl text-sm md:text-base">
                The trade deadline approaches. Purple Reign extends their win streak while the middle of the pack tightens. 
                Data synchronized as of Nov 14, 09:41 EST.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
              <div className="bg-card p-4 flex flex-col">
                <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-1">League Avg</span>
                <span className="font-mono text-lg font-medium">109.4</span>
              </div>
              <div className="bg-card p-4 flex flex-col">
                <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-1">Top Score</span>
                <span className="font-mono text-lg font-medium text-primary">142.8</span>
              </div>
              <div className="bg-card p-4 flex flex-col">
                <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-1">Transactions</span>
                <span className="font-mono text-lg font-medium">47</span>
              </div>
              <div className="bg-card p-4 flex flex-col">
                <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-1">Status</span>
                <span className="font-mono text-lg font-medium flex items-center gap-1">
                  <span className="size-2 rounded-full bg-green-500"></span> Live
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Matchups Strip */}
        <section className="border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-mono uppercase tracking-wider font-semibold">Live Matchups</h2>
            </div>
            <a href="#" className="text-xs font-mono text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
              View All <ChevronRight className="h-3 w-3" />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            {MATCHUPS.map((match, i) => (
              <div key={i} className="p-4 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground font-mono">{match.status}</span>
                  {match.status === "Live" && <Badge variant="outline" className="rounded-none border-green-500/30 text-green-600 bg-green-500/10 text-[10px] px-1.5 py-0 h-4 uppercase">In Progress</Badge>}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{match.away}</span>
                    <span className="font-mono text-sm">{match.awayScore.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{match.home}</span>
                    <span className="font-mono text-sm">{match.homeScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Standings Table */}
          <section className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-foreground" />
                <h2 className="text-lg font-semibold tracking-tight">Current Standings</h2>
              </div>
              <Button variant="outline" size="sm" className="rounded-none font-mono text-xs uppercase h-8">Full Standings</Button>
            </div>
            
            <div className="border border-border bg-card overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-center font-mono text-xs uppercase tracking-wider">Rnk</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">Team</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-wider">W-L-T</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-wider hidden sm:table-cell">PF</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-wider hidden sm:table-cell">PA</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-wider">Strk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {STANDINGS.map((team) => (
                    <TableRow key={team.rank} className="border-b border-border/50 hover:bg-muted/20">
                      <TableCell className="text-center font-mono text-sm text-muted-foreground">
                        {team.rank}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-none border border-border">
                            <AvatarFallback className="rounded-none bg-muted font-mono text-xs text-muted-foreground">
                              {team.team.substring(0,2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{team.team}</span>
                            <span className="text-xs text-muted-foreground">{team.manager}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {team.w}-{team.l}-{team.t}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground hidden sm:table-cell">
                        {team.pf.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground hidden sm:table-cell">
                        {team.pa.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span className={`inline-flex items-center gap-1 ${team.streak.startsWith('W') ? 'text-green-600' : 'text-red-600'}`}>
                          {team.streak.startsWith('W') ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {team.streak}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          {/* Transactions & Activity */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-foreground" />
                <h2 className="text-lg font-semibold tracking-tight">Recent Activity</h2>
              </div>
            </div>
            
            <div className="border border-border bg-card">
              <div className="divide-y divide-border">
                {TRANSACTIONS.map((tx) => (
                  <div key={tx.id} className="p-4 flex flex-col gap-3 hover:bg-muted/10 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`rounded-none text-[10px] uppercase font-mono px-1.5 py-0 h-5 
                          ${tx.type === 'Trade' ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground'}`}>
                          {tx.type}
                        </Badge>
                        <span className="text-xs font-medium">{tx.team}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {tx.date}
                      </span>
                    </div>
                    
                    <div className="space-y-1.5 border-l-2 border-border pl-3 ml-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-green-600 uppercase w-8">ADD</span>
                        <span className="text-sm">{tx.playerAdd}</span>
                        {tx.bid !== "-" && <span className="text-xs font-mono text-muted-foreground ml-auto bg-muted px-1 py-0.5">{tx.bid}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-red-600 uppercase w-8">DROP</span>
                        <span className="text-sm text-muted-foreground">{tx.playerDrop}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border bg-muted/20">
                <Button variant="ghost" className="w-full text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
                  View All Transactions
                </Button>
              </div>
            </div>

            {/* Mini Chart/Stats card */}
            <Card className="rounded-none border-border shadow-none mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" /> 
                  League Metric
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[120px] w-full flex items-end justify-between gap-1 mt-4">
                  {[40, 65, 45, 80, 55, 90, 75, 100, 60, 85].map((h, i) => (
                    <div key={i} className="w-full bg-primary/20 hover:bg-primary transition-colors cursor-pointer relative group" style={{ height: `${h}%` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-mono px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        W{i+1}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-2 uppercase">
                  <span>Week 1</span>
                  <span>Scoring Trend</span>
                  <span>Week 10</span>
                </div>
              </CardContent>
            </Card>

          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 font-mono font-bold tracking-tighter text-sm uppercase opacity-70">
            <div className="size-5 bg-foreground flex items-center justify-center text-background">
              M
            </div>
            <span>Minnesota Slopes</span>
          </div>
          <p className="text-xs font-mono text-muted-foreground text-center">
            SYSTEM V.24.11 // DATA UPDATED NOV 14 // © 2024
          </p>
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <a href="#" className="hover:text-foreground">RULES</a>
            <a href="#" className="hover:text-foreground">API</a>
            <a href="#" className="hover:text-foreground">ADMIN</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
