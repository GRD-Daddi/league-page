import React from "react";
import {
  Trophy,
  Activity,
  Calendar,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  UserPlus,
  UserMinus,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function StadiumNight() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const standings = [
    { rank: 1, team: "Purple Reign", manager: "Alex M.", w: 8, l: 2, points: 1245.6, streak: "W4" },
    { rank: 2, team: "Lake Effect", manager: "Sarah J.", w: 7, l: 3, points: 1198.2, streak: "W1" },
    { rank: 3, team: "Diggs It", manager: "Mike T.", w: 6, l: 4, points: 1150.8, streak: "L1" },
    { rank: 4, team: "Sled Dogs", manager: "Chris P.", w: 6, l: 4, points: 1112.4, streak: "W2" },
    { rank: 5, team: "Vikings Funeral", manager: "Dan R.", w: 5, l: 5, points: 1089.1, streak: "L3" },
    { rank: 6, team: "Tundra FC", manager: "Emma W.", w: 4, l: 6, points: 1045.7, streak: "L1" },
  ];

  const transactions = [
    { type: "add", player: "J. Jefferson", position: "WR", team: "Purple Reign", date: "2 hrs ago" },
    { type: "drop", player: "A. Mattison", position: "RB", team: "Purple Reign", date: "2 hrs ago" },
    { type: "trade", player: "T. Hockenson", position: "TE", team: "Diggs It", date: "Yesterday" },
    { type: "trade", player: "K. Cousins", position: "QB", team: "Sled Dogs", date: "Yesterday" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-[#00f0ff] selection:text-black">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[#1f2937] bg-[#0a0a0c]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00f0ff] to-[#7000ff] flex items-center justify-center transform -skew-x-12 border border-[#00f0ff]/30 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-2xl tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                Minnesota <span className="text-[#00f0ff]">Slopes</span>
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              {["Home", "Matchups", "Standings", "Rosters", "Transactions", "History"].map((item) => (
                <a key={item} href={`/${item.toLowerCase()}`} className="text-sm font-bold uppercase tracking-wider text-gray-400 hover:text-[#00f0ff] transition-colors">
                  {item}
                </a>
              ))}
              <Button className="bg-[#ccff00] hover:bg-[#aacc00] text-black font-black uppercase tracking-widest px-8 rounded-none skew-x-[-10deg] border border-[#ccff00] shadow-[0_0_20px_rgba(204,255,0,0.2)] hover:shadow-[0_0_30px_rgba(204,255,0,0.4)] transition-all">
                <span className="skew-x-[10deg]">Login</span>
              </Button>
            </div>

            {/* Mobile Nav Toggle */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-400 hover:text-white">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0f1115] border-b border-[#1f2937]">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {["Home", "Matchups", "Standings", "Rosters", "Transactions", "History"].map((item) => (
                <a key={item} href={`/${item.toLowerCase()}`} className="block px-3 py-2 text-base font-bold uppercase tracking-wider text-gray-400 hover:text-[#00f0ff] hover:bg-[#1f2937]/50 rounded-md">
                  {item}
                </a>
              ))}
              <Button className="w-full mt-4 bg-[#ccff00] hover:bg-[#aacc00] text-black font-black uppercase tracking-widest rounded-none">
                Login
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="relative border-b border-[#1f2937] overflow-hidden bg-[#0f1115]">
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/stadium-hero.png" 
            alt="Stadium Background" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] via-[#0a0a0c]/50 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 flex flex-col items-start">
          <Badge className="bg-[#7000ff]/20 text-[#ccff00] border border-[#7000ff]/50 px-3 py-1 mb-6 text-xs font-black uppercase tracking-[0.2em]">
            <span className="w-2 h-2 rounded-full bg-[#ccff00] mr-2 animate-pulse inline-block" />
            Live • Week 11
          </Badge>
          
          <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-[0.85] mb-6">
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">The Battle</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#7000ff]">For The North</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 border-l-4 border-[#00f0ff] pl-4 font-medium">
            Welcome to the premier fantasy football league of the frozen tundra. 
            Where championships are forged in the cold and legends never die.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="bg-[#ccff00] hover:bg-[#aacc00] text-black font-black uppercase tracking-widest px-8 h-14 rounded-none skew-x-[-10deg]">
              <span className="skew-x-[10deg] flex items-center gap-2">
                View Matchups <ChevronRight className="w-5 h-5" />
              </span>
            </Button>
            <Button size="lg" variant="outline" className="border-[#1f2937] text-white hover:bg-[#1f2937] hover:text-[#00f0ff] font-black uppercase tracking-widest px-8 h-14 rounded-none skew-x-[-10deg]">
              <span className="skew-x-[10deg]">League Rules</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Standings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1f2937] pb-4">
            <h2 className="text-2xl font-black uppercase italic tracking-tight flex items-center gap-3">
              <Trophy className="text-[#ccff00] w-6 h-6" />
              Current Standings
            </h2>
            <a href="/standings" className="text-sm font-bold text-[#00f0ff] hover:text-white uppercase tracking-wider flex items-center gap-1 transition-colors">
              Full Standings <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="bg-[#0f1115] border border-[#1f2937] rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1a1d24] text-gray-400 text-xs font-black uppercase tracking-wider">
                    <th className="p-4 w-16 text-center">Rnk</th>
                    <th className="p-4">Team</th>
                    <th className="p-4 text-center">W-L</th>
                    <th className="p-4 text-right">Points</th>
                    <th className="p-4 text-center">Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2937]">
                  {standings.map((team, idx) => (
                    <tr key={team.team} className="group hover:bg-[#1a1d24] transition-colors">
                      <td className="p-4 text-center font-black text-xl text-gray-500 group-hover:text-white">
                        {team.rank}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border-2 border-[#1f2937] group-hover:border-[#00f0ff] transition-colors">
                            <AvatarFallback className="bg-gradient-to-br from-gray-800 to-black text-[#00f0ff] font-bold">
                              {team.team.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-lg group-hover:text-[#00f0ff] transition-colors">
                              {team.team}
                            </div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider">
                              {team.manager}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-lg">
                        {team.w}-{team.l}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-lg text-[#ccff00]">
                        {team.points.toFixed(1)}
                      </td>
                      <td className="p-4 text-center">
                        <Badge 
                          className={`uppercase font-black rounded-sm px-2 py-0.5 ${
                            team.streak.startsWith('W') 
                              ? 'bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/30' 
                              : 'bg-red-500/10 text-red-500 border border-red-500/30'
                          }`}
                        >
                          {team.streak}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Transactions & Activity */}
        <div className="space-y-8">
          
          {/* Recent Activity */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#1f2937] pb-4">
              <h2 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                <Activity className="text-[#00f0ff] w-5 h-5" />
                Recent Moves
              </h2>
            </div>

            <div className="space-y-3">
              {transactions.map((tx, idx) => (
                <div key={idx} className="bg-[#0f1115] border border-[#1f2937] p-4 rounded-lg flex items-start gap-4 hover:border-[#374151] transition-colors">
                  <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === 'add' ? 'bg-[#ccff00]/10 text-[#ccff00]' :
                    tx.type === 'drop' ? 'bg-red-500/10 text-red-500' :
                    'bg-[#00f0ff]/10 text-[#00f0ff]'
                  }`}>
                    {tx.type === 'add' ? <UserPlus className="w-4 h-4" /> :
                     tx.type === 'drop' ? <UserMinus className="w-4 h-4" /> :
                     <ArrowRightLeft className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold truncate">
                        {tx.player} <span className="text-gray-500 font-normal text-xs">{tx.position}</span>
                      </p>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{tx.date}</span>
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">
                      {tx.type === 'add' ? 'Added by ' : tx.type === 'drop' ? 'Dropped by ' : 'Traded by '}
                      <span className="text-white font-semibold">{tx.team}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full border-[#1f2937] text-gray-400 hover:text-white hover:bg-[#1f2937] font-bold uppercase tracking-wider">
              View All Transactions
            </Button>
          </div>

          {/* Quick Stats */}
          <Card className="bg-gradient-to-br from-[#1a1d24] to-[#0f1115] border-[#1f2937] rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 border-b border-[#1f2937]">
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Highest Score</h3>
                <div className="flex justify-between items-end">
                  <div className="font-mono text-3xl font-black text-[#00f0ff]">184.2</div>
                  <div className="text-sm font-bold text-white text-right">Week 9<br/><span className="text-gray-400">Lake Effect</span></div>
                </div>
              </div>
              <div className="p-6 border-b border-[#1f2937]">
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Biggest Blowout</h3>
                <div className="flex justify-between items-end">
                  <div className="font-mono text-3xl font-black text-[#7000ff]">78.4</div>
                  <div className="text-sm font-bold text-white text-right">Week 4<br/><span className="text-gray-400">Purple Reign</span></div>
                </div>
              </div>
              <div className="p-6 bg-[#ccff00]/5 hover:bg-[#ccff00]/10 transition-colors cursor-pointer flex items-center justify-between">
                <span className="font-bold text-[#ccff00] uppercase tracking-wider text-sm">View Power Rankings</span>
                <ChevronRight className="w-5 h-5 text-[#ccff00]" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1f2937] bg-[#0f1115] py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-[#1f2937]" />
            <span className="font-black text-xl tracking-tighter uppercase italic text-gray-500">
              Minnesota <span className="text-gray-400">Slopes</span>
            </span>
          </div>
          <div className="flex gap-6 text-sm font-bold uppercase tracking-wider text-gray-600">
            <a href="/rules" className="hover:text-white transition-colors">Rules</a>
            <a href="/history" className="hover:text-white transition-colors">History</a>
            <a href="/contact" className="hover:text-white transition-colors">Commish</a>
          </div>
          <p className="text-xs text-gray-600 font-medium">
            © {new Date().getFullYear()} Minnesota Slopes FF. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
