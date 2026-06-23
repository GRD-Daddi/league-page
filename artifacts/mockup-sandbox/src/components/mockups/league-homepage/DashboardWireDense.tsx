import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Activity,
  Calendar,
  ChevronRight,
  RefreshCw,
  Clock
} from "lucide-react";

export function DashboardWireDense() {
  const standings = [
    { rank: 1, name: "Purple Reign", w: 8, l: 2, t: 0, pf: 1145.2, pa: 980.5, streak: "W4", proj: 1, winPct: 80 },
    { rank: 2, name: "Tundra FC", w: 7, l: 3, t: 0, pf: 1089.4, pa: 1010.2, streak: "W1", proj: 2, winPct: 70 },
    { rank: 3, name: "Sled Dogs", w: 6, l: 4, t: 0, pf: 1050.8, pa: 1020.1, streak: "L3", proj: 4, winPct: 60 },
    { rank: 4, name: "Lake Effect", w: 5, l: 5, t: 0, pf: 980.5, pa: 1050.8, streak: "L1", proj: 3, winPct: 50 },
    { rank: 5, name: "Diggs It", w: 4, l: 6, t: 0, pf: 950.2, pa: 1100.4, streak: "W2", proj: 5, winPct: 40 },
    { rank: 6, name: "Vikings Funeral", w: 0, l: 10, t: 0, pf: 820.1, pa: 1200.9, streak: "L10", proj: 6, winPct: 0 },
  ];

  const matchups = [
    { away: { name: "Purple Reign", score: 112.5, proj: 124.2, prob: 78 }, home: { name: "Tundra FC", score: 88.4, proj: 102.1, prob: 22 }, status: "LIVE" },
    { away: { name: "Sled Dogs", score: 45.2, proj: 110.5, prob: 45 }, home: { name: "Lake Effect", score: 55.8, proj: 115.2, prob: 55 }, status: "PREGAME" },
    { away: { name: "Diggs It", score: 130.4, proj: 130.4, prob: 100 }, home: { name: "Vikings Funeral", score: 92.1, proj: 95.8, prob: 0 }, status: "FINAL" },
  ];

  const transactions = [
    { type: "WAIVER", team: "Purple Reign", player: "Puka Nacua, WR, LAR", details: "Added from Waivers", date: "Today, 2:14 AM", faab: "$88" },
    { type: "TRADE", team: "Sled Dogs", player: "Jalen Hurts, QB, PHI", details: "Traded for Alvin Kamara", date: "Yesterday, 4:30 PM" },
    { type: "WAIVER", team: "Lake Effect", player: "Kyren Williams, RB, LAR", details: "Added from Waivers", date: "Tue, 2:14 AM", faab: "$12" },
    { type: "DROP", team: "Diggs It", player: "Kadarius Toney, WR, KC", details: "Dropped to Waivers", date: "Mon, 1:05 PM" },
  ];

  const tickerItems = [
    "Purple Reign clinches playoff berth",
    "Trade deadline in 48hrs",
    "Sled Dogs on 3-game losing skid",
    "Vikings Funeral mathematically eliminated",
    "Lake Effect projected for 115 pts this week"
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-mono text-sm selection:bg-blue-600/30 selection:text-blue-200">
      
      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="#" className="font-bold text-white tracking-wider flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-blue-600" />
              NFFL_TERMINAL
            </a>
            <nav className="hidden md:flex items-center gap-1 text-xs">
              <a href="#" className="px-3 py-1.5 text-zinc-100 bg-zinc-900 rounded-none">DASHBOARD</a>
              <a href="#" className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors rounded-none">MATCHUPS</a>
              <a href="#" className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors rounded-none">PLAYERS</a>
              <a href="#" className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors rounded-none">LEAGUE</a>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-none bg-blue-600 animate-pulse"></span>
              <span className="text-zinc-400">SYS_ONLINE</span>
            </div>
            <div className="w-px h-4 bg-zinc-800"></div>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">MANAGER_ID: 9402</a>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 py-6 flex flex-col gap-6">
        
        {/* Data-Rich Hero Section */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Week 11 Overview</h1>
              <p className="text-zinc-500 mt-1 flex items-center gap-2 text-xs">
                <Clock className="w-3 h-3" /> Last updated: 09:42:15 UTC
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-none border-zinc-800 hover:bg-zinc-900 hover:text-white text-xs h-8">
                <RefreshCw className="w-3 h-3 mr-2" /> REFRESH
              </Button>
              <Button size="sm" className="rounded-none bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                SUBMIT LINEUP
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: "LEAGUE AVG", value: "102.4 PTS", trend: "+4.2" },
              { label: "TOP SCORE", value: "130.4 PTS", trend: "DIGGS" },
              { label: "TRANSACTIONS", value: "142 TOT", trend: "THIS YR" },
              { label: "ACTIVE WAIVERS", value: "14 REQ", trend: "PENDING" },
              { label: "PLAYOFF SPOTS", value: "3 LEFT", trend: "6 TOTAL" },
              { label: "TRADE DEADLINE", value: "2 DAYS", trend: "NOV 22" },
            ].map((stat, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800/80 p-3 flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 uppercase">{stat.label}</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-zinc-200">{stat.value}</span>
                  <span className="text-[10px] text-zinc-400">{stat.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pulse Ticker */}
        <div className="w-full bg-blue-900/10 border border-blue-900/30 flex items-center h-8 overflow-hidden text-xs">
          <div className="bg-blue-600 text-white px-3 h-full flex items-center font-bold tracking-wider shrink-0">
            PULSE
          </div>
          <div className="flex-1 overflow-hidden relative">
            <div className="flex gap-8 items-center absolute whitespace-nowrap animate-[marquee_20s_linear_infinite] left-0 top-1/2 -translate-y-1/2">
              {tickerItems.map((item, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-none"></span>
                  {item}
                </span>
              ))}
              {/* Duplicate for seamless looping */}
              {tickerItems.map((item, i) => (
                <span key={`dup-${i}`} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-none"></span>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Matchup Probability */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {matchups.map((match, i) => (
            <Card key={i} className="rounded-none border-zinc-800/80 bg-zinc-900/30">
              <div className="p-3 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-900/50">
                <span className="text-xs text-zinc-400">{match.status === 'LIVE' ? 'LIVE NOW' : match.status}</span>
                {match.status === 'LIVE' && <span className="w-2 h-2 bg-blue-600 animate-pulse rounded-none"></span>}
              </div>
              <CardContent className="p-4 flex flex-col gap-4">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-1 w-1/2 pr-2">
                    <span className={`text-sm truncate ${match.away.score > match.home.score ? 'text-white font-bold' : 'text-zinc-400'}`}>
                      {match.away.name}
                    </span>
                    <span className="text-lg text-zinc-100">{match.away.score.toFixed(1)}</span>
                    <span className="text-[10px] text-zinc-500">PROJ: {match.away.proj.toFixed(1)}</span>
                  </div>
                  <div className="flex flex-col gap-1 w-1/2 pl-2 text-right">
                    <span className={`text-sm truncate ${match.home.score > match.away.score ? 'text-white font-bold' : 'text-zinc-400'}`}>
                      {match.home.name}
                    </span>
                    <span className="text-lg text-zinc-100">{match.home.score.toFixed(1)}</span>
                    <span className="text-[10px] text-zinc-500">PROJ: {match.home.proj.toFixed(1)}</span>
                  </div>
                </div>
                
                {/* Win Probability Bar */}
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-blue-400">{match.away.prob}% WIN PROB</span>
                    <span className="text-zinc-500">{match.home.prob}%</span>
                  </div>
                  <div className="h-1.5 w-full flex bg-zinc-800">
                    <div className="h-full bg-blue-600" style={{ width: `${match.away.prob}%` }}></div>
                    <div className="h-full bg-zinc-600" style={{ width: `${match.home.prob}%` }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Content - Standings */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card className="rounded-none border-zinc-800/80 bg-black overflow-hidden">
              <CardHeader className="p-4 border-b border-zinc-800/80 bg-zinc-900/50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold tracking-wider uppercase text-zinc-100">DIVISIONAL STANDINGS</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-500 hover:text-blue-400 hover:bg-transparent p-0 rounded-none">
                  VIEW FULL <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left whitespace-nowrap">
                  <thead className="bg-zinc-900/80 text-zinc-500 border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3 font-normal">TEAM</th>
                      <th className="px-4 py-3 font-normal w-24">W-L-T</th>
                      <th className="px-4 py-3 font-normal text-right">PF</th>
                      <th className="px-4 py-3 font-normal text-right">PA</th>
                      <th className="px-4 py-3 font-normal text-center">STRK</th>
                      <th className="px-4 py-3 font-normal text-center">PROJ</th>
                      <th className="px-4 py-3 font-normal w-24">WIN %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {standings.map((team) => (
                      <tr 
                        key={team.rank} 
                        className={`hover:bg-zinc-900/30 transition-colors h-10 ${
                          team.rank <= 3 ? 'border-l-2 border-l-blue-500/50' : 'border-l-2 border-l-red-500/30'
                        }`}
                      >
                        <td className="px-4 font-semibold text-zinc-200">
                          <span className="text-zinc-600 mr-3 w-4 inline-block text-right">{team.rank}</span>
                          {team.name}
                        </td>
                        <td className="px-4 text-zinc-400">{team.w}-{team.l}-{team.t}</td>
                        <td className="px-4 text-right text-zinc-300">{team.pf.toFixed(1)}</td>
                        <td className="px-4 text-right text-zinc-500">{team.pa.toFixed(1)}</td>
                        <td className="px-4 text-center">
                          <span className={`px-1.5 py-0.5 rounded-none text-[10px] ${
                            team.streak.startsWith('W') ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {team.streak}
                          </span>
                        </td>
                        <td className="px-4 text-center text-zinc-400">{team.proj}</td>
                        <td className="px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] w-6 text-right">{team.winPct}%</span>
                            <div className="w-12 h-1 bg-zinc-800 rounded-none overflow-hidden">
                              <div className="h-full bg-blue-600" style={{ width: `${team.winPct}%` }}></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Sidebar - Transactions */}
          <div className="flex flex-col gap-4">
            <Card className="rounded-none border-zinc-800/80 bg-zinc-900/20">
              <CardHeader className="p-4 border-b border-zinc-800/80 bg-zinc-900/50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold tracking-wider uppercase text-zinc-100">WIRE_FEED</CardTitle>
                <Badge variant="outline" className="rounded-none border-zinc-700 bg-black text-zinc-300 text-[10px]">LATEST</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-800/50">
                  {transactions.map((tx, i) => (
                    <div key={i} className="p-4 hover:bg-zinc-900/30 transition-colors flex gap-3">
                      <div className="mt-0.5">
                        {tx.type === 'WAIVER' && <ArrowUpRight className="w-4 h-4 text-blue-500" />}
                        {tx.type === 'DROP' && <ArrowDownRight className="w-4 h-4 text-red-500" />}
                        {tx.type === 'TRADE' && <RefreshCw className="w-4 h-4 text-purple-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-bold text-zinc-200">{tx.player}</p>
                          <span className="text-[10px] text-zinc-500">{tx.date}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-tight">
                          {tx.details} by <span className="text-zinc-300">{tx.team}</span>
                        </p>
                        {tx.faab && (
                          <p className="text-[10px] text-blue-400 mt-1">
                            FAAB BID: {tx.faab}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-zinc-800/80">
                  <Button variant="ghost" className="w-full text-xs text-zinc-400 hover:text-white rounded-none h-8">
                    LOAD MORE LOGS
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-zinc-800/80 bg-zinc-950">
        <div className="max-w-[1280px] mx-auto">
          <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-800/50 text-[10px] text-zinc-500">
            <span className="uppercase font-semibold">WAIVER PRIORITY:</span>
            <div className="flex gap-4">
              <span>1. V. FUNERAL</span>
              <span>2. DIGGS IT</span>
              <span>3. LAKE EFFECT</span>
              <span>4. SLED DOGS</span>
              <span className="hidden md:inline">5. TUNDRA FC</span>
              <span className="hidden md:inline">6. P. REIGN</span>
            </div>
          </div>
          <div className="px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <p>NFFL_SYSTEM // TERMINAL_UI // v2.4.1</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-zinc-300">DOCS</a>
              <a href="#" className="hover:text-zinc-300">API</a>
              <a href="#" className="hover:text-zinc-300">STATUS</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom Keyframes for Marquee */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
}
