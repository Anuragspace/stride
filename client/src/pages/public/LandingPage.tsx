import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden font-mono selection:bg-[#FF4B2B] selection:text-white">
      {/* Abstract Background Grid */}
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Top Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#FF4B2B] to-[#FF416C] flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(255,75,43,0.5)]">
            S
          </div>
          <span className="text-xl font-bold tracking-tight">StrideWay</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Log In
          </button>
          <button 
            onClick={() => navigate('/signup')}
            className="text-sm px-4 py-2 bg-white text-black font-semibold rounded hover:bg-gray-200 transition-colors"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-6 text-center max-w-5xl mx-auto mt-12 md:mt-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF4B2B] rounded-full blur-[150px] opacity-10 pointer-events-none" />
        
        <div className="space-y-2 mb-8">
          <p className="text-[#FF4B2B] uppercase tracking-[0.2em] text-xs md:text-sm font-semibold">
            // Fast & Furious Collaboration //
          </p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 font-sans">
            The Brain Behind Your <br className="hidden md:block"/> Team's Flow
          </h1>
        </div>

        <p className="text-gray-400 max-w-2xl text-lg md:text-xl leading-relaxed mb-10 font-sans">
          A unified context layer to capture your entire working context: 
          real-time kanban, lightning-fast chat, and scalable architecture designed for high throughput.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={() => navigate('/signup')}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] text-white font-bold rounded shadow-[0_0_20px_rgba(255,75,43,0.4)] hover:shadow-[0_0_30px_rgba(255,75,43,0.6)] transition-all transform hover:-translate-y-0.5"
          >
            Get Started
          </button>
          <button 
            className="w-full sm:w-auto px-8 py-3 bg-white/5 border border-white/10 text-white font-bold rounded hover:bg-white/10 transition-all"
          >
            Talk to us
          </button>
        </div>

        {/* Abstract Data Tree Graphic (Placeholder for the generated image) */}
        <div className="mt-20 w-full relative h-[400px] rounded-xl overflow-hidden border border-white/10 bg-black/50 shadow-2xl">
          {/* Fallback graphic if image is not ready */}
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 opacity-50">
            <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-[#FF4B2B] to-transparent shadow-[0_0_10px_#FF4B2B]" />
            <div className="flex gap-10">
              <div className="w-px h-32 bg-gradient-to-b from-[#FF4B2B] to-transparent" />
              <div className="w-px h-24 bg-gradient-to-b from-[#FF4B2B] to-transparent" />
              <div className="w-px h-40 bg-gradient-to-b from-[#FF4B2B] to-transparent" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">[ Abstract Data Tree Visual ]</p>
          </div>
        </div>
      </main>

      {/* Features Bento Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24 border-t border-white/5 mt-10">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-16 font-sans">
          Everything You Need To<br/>Build Real Synergy
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent hover:border-[#FF4B2B]/50 transition-colors group">
            <h3 className="text-2xl font-bold mb-4 font-sans text-white group-hover:text-[#FF4B2B] transition-colors">Highest Recall Accuracy</h3>
            <p className="text-gray-400 font-sans leading-relaxed mb-8">
              The highest accuracy context engine for your team. Never lose a task, a comment, or an attachment again.
            </p>
            <div className="h-48 rounded bg-gradient-to-r from-[#FF4B2B] to-orange-500 flex items-center justify-center flex-col">
              <span className="text-6xl font-bold text-white tracking-tighter">99%</span>
              <span className="text-white/80 uppercase tracking-widest text-sm mt-2">Uptime</span>
            </div>
          </div>

          <div className="p-8 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent hover:border-[#FF4B2B]/50 transition-colors group">
            <h3 className="text-2xl font-bold mb-4 font-sans text-white group-hover:text-[#FF4B2B] transition-colors">Scales Like Magic</h3>
            <p className="text-gray-400 font-sans leading-relaxed mb-8">
              Designed for high throughput & low latency. Micro-batching Socket.IO events ensures no dropped frames.
            </p>
            <div className="h-48 rounded border border-white/10 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="relative z-10 flex items-center gap-4 text-sm text-gray-300">
                <div className="px-4 py-2 border border-white/20 bg-black rounded shadow-[0_0_15px_rgba(255,75,43,0.3)]">Grid</div>
                <div className="w-8 h-px bg-[#FF4B2B]" />
                <div className="px-4 py-2 border border-[#FF4B2B] bg-[#FF4B2B]/10 rounded shadow-[0_0_20px_rgba(255,75,43,0.5)]">Memory</div>
                <div className="w-8 h-px bg-[#FF4B2B]" />
                <div className="px-4 py-2 border border-white/20 bg-black rounded">Sync</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="border-t border-white/5 py-8 text-center text-gray-600 text-sm">
        <p>© 2026 StrideWay Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
