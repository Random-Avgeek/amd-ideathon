/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Utensils, 
  Map as MapIcon, 
  Settings, 
  LogOut, 
  User as UserIcon,
  ChefHat,
  Sparkles,
  Flame,
  ChefHatIcon,
  Wallet
} from "lucide-react";
import { auth, signInWithGoogle, signOut } from "./lib/firebase.ts";
import { onAuthStateChanged, User } from "firebase/auth";
import SearchBar from "./components/SearchBar.tsx";
import MemeModeToggle from "./components/MemeModeToggle.tsx";
import BudgetSelector from "./components/BudgetSelector.tsx";
import RestaurantMap from "./components/RestaurantMap.tsx";
import { askCraveBot, performOcr } from "./services/gemini.ts";
import { useGeoLocation } from "./hooks/useGeoLocation.ts";
import ReactMarkdown from "react-markdown";
import { cn } from "./lib/utils.ts";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [memeMode, setMemeMode] = useState(false);
  const [budget, setBudget] = useState<"low" | "mid" | "high">("mid");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'ai' | 'user'; content: string }[]>([]);
  const [mapResults, setMapResults] = useState<any[]>([]);
  const [activeQuery, setActiveQuery] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { location } = useGeoLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, loading]);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const handleSearch = async (text: string, image?: string) => {
    setLoading(true);
    let ocrText = "";
    
    if (image) {
      setChatHistory(prev => [...prev, { role: 'user', content: "[Uploaded an image]" }]);
      try {
        ocrText = await performOcr(image);
      } catch (err) {
        console.error(err);
      }
    }
    
    if (text) {
      setChatHistory(prev => [...prev, { role: 'user', content: text }]);
      setActiveQuery(text); // Trigger map search
    }

    try {
      const response = await askCraveBot(text || "Analyze this menu", memeMode, ocrText, budget);
      setChatHistory(prev => [...prev, { role: 'ai', content: response }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'ai', content: "My chefs are busy. Try again soon." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8"
        >
          <div className="relative inline-block">
             <div className="absolute -inset-4 bg-orange-500/20 blur-3xl rounded-full" />
             <ChefHat className="w-20 h-20 text-orange-500 mx-auto relative" />
          </div>
          <div className="space-y-4">
            <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic">CraveBot AI</h1>
            <p className="text-zinc-400 max-w-md mx-auto text-lg leading-relaxed">
              Your personal AI food sommelier. Finds what you crave, roasts what you eat.
            </p>
          </div>
          <button 
            onClick={signInWithGoogle}
            className="group relative px-8 py-4 bg-white text-black font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-2">
              Get Started with Google
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-700",
      memeMode ? "bg-zinc-950" : "bg-black"
    )}>
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={cn(
          "absolute top-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full transition-colors duration-1000",
          memeMode ? "bg-yellow-500/10" : "bg-orange-500/5"
        )} />
        <div className={cn(
          "absolute bottom-0 left-0 w-[600px] h-[600px] blur-[150px] rounded-full transition-colors duration-1000",
          memeMode ? "bg-purple-500/10" : "bg-red-500/5"
        )} />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-900 bg-black/50 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Flame className="w-8 h-8 text-orange-500 fill-current" />
             <span className="text-xl font-bold tracking-tighter text-white italic invisible md:visible">CRAVEBOT</span>
          </div>
          
          <div className="flex items-center gap-6">
            <MemeModeToggle enabled={memeMode} onToggle={setMemeMode} />
            <div className="h-8 w-[1px] bg-zinc-800" />
            <div className="flex items-center gap-3">
               <img src={user.photoURL || ""} className="w-8 h-8 rounded-full border border-zinc-700" alt="avatar" />
               <button onClick={signOut} className="text-zinc-500 hover:text-white transition-colors">
                  <LogOut className="w-5 h-5" />
               </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-100px)]">
        {/* Left: Chat & Controls */}
        <section className="lg:col-span-5 flex flex-col h-full space-y-4">
          <div className="flex-1 bg-zinc-900/30 rounded-3xl border border-zinc-800 backdrop-blur-sm overflow-hidden flex flex-col shadow-inner">
            <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/50 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Chef AI is Online</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Budget Range
                </label>
                <BudgetSelector current={budget} onChange={setBudget} />
              </div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {chatHistory.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center">
                    <ChefHatIcon className="w-8 h-8 text-white/20" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Ready to serve.</h3>
                    <p className="text-zinc-500 text-sm">Tell me what you're craving or upload a menu.</p>
                  </div>
                </div>
              )}
              {chatHistory.map((chat, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i} 
                  className={cn(
                    "flex flex-col gap-2",
                    chat.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    chat.role === 'user' 
                      ? "bg-orange-500 text-white rounded-br-none" 
                      : memeMode 
                        ? "bg-yellow-400 text-black font-bold rounded-bl-none shadow-[4px_4px_0px_#000]"
                        : "bg-zinc-800 text-zinc-100 rounded-bl-none border border-zinc-700"
                  )}>
                    <div className={cn(
                      "prose prose-sm",
                      !memeMode || chat.role === 'user' ? "prose-invert" : "prose-zinc text-black"
                    )}>
                      <ReactMarkdown>
                        {chat.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-2">
                   <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
                   <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                   <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
            </div>
          </div>

          <SearchBar onSearch={handleSearch} loading={loading} />
        </section>

        {/* Right: Map & Discovery */}
        <section className="lg:col-span-7 h-full flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-white font-bold flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-orange-500" />
              Nearby Gems
            </h2>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
               Live Discovery
            </span>
          </div>
          
          <div className="flex-1 relative">
            <RestaurantMap 
               center={location || { lat: 35.6762, lng: 139.6503 }} 
               query={activeQuery}
               budget={budget}
               onPlacesFound={setMapResults} 
            />
            
            {mapResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-4 right-4 w-48 space-y-2 pointer-events-none"
              >
                {mapResults.map(p => (
                  <div key={p.id} className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
                    <p className="text-white text-xs font-bold truncate">{p.name || p.displayName}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-orange-500 font-bold">★ {p.rating}</span>
                      <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                      <span className="text-[10px] text-zinc-500">Verified By AI</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
