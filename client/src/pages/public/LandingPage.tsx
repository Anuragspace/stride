import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Layers, Zap, Shield, LayoutDashboard, MessageSquare } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas text-ink overflow-x-hidden font-sans selection:bg-accent/30 selection:text-ink">
      {/* Background Gradient Spotlight */}
      <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center">
        <div className="w-[800px] h-[800px] bg-accent rounded-full blur-[150px] opacity-[0.03]" />
      </div>

      {/* Top Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-md border-b border-hairline bg-canvas/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-accent/20">
            S
          </div>
          <span className="text-xl font-bold tracking-heading text-ink">Stride</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="text-[13px] font-medium text-ink-subtle hover:text-ink transition-colors"
          >
            Log in
          </button>
          <button 
            onClick={() => navigate('/signup')}
            className="text-[13px] px-4 py-2 bg-ink text-canvas font-semibold rounded-md hover:bg-white/90 transition-colors shadow-sm"
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-6 text-center max-w-5xl mx-auto mt-12 md:mt-0">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-hairline bg-surface-1 mb-8">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[12px] font-medium text-ink-subtle tracking-wide uppercase">Stride v1.0 is live</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-display leading-[1.1] text-ink mb-6">
          The Workspace That <br className="hidden md:block"/> Moves With You
        </h1>

        <p className="text-ink-muted max-w-2xl text-lg md:text-xl leading-relaxed mb-10 tracking-body">
          A unified context layer connecting your team's real-time kanban boards, lightning-fast chat, and workflow automation in one beautifully designed space.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={() => navigate('/signup')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white font-medium rounded-md hover:bg-accent/90 transition-all shadow-[0_0_20px_rgba(0,153,255,0.2)] hover:shadow-[0_0_30px_rgba(0,153,255,0.4)]"
          >
            Get Started <ChevronRight className="w-4 h-4" />
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-6 py-3 bg-surface-1 border border-hairline text-ink font-medium rounded-md hover:bg-surface-2 transition-colors"
          >
            View Demo
          </button>
        </div>

        {/* Abstract Product Visual */}
        <div className="mt-20 w-full relative h-[400px] rounded-xl overflow-hidden border border-hairline bg-surface-1 shadow-2xl flex flex-col items-center justify-center group">
          <div className="absolute inset-0 bg-gradient-to-t from-canvas to-transparent z-10" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          
          <div className="relative z-20 flex gap-4 transform transition-transform duration-700 group-hover:scale-105">
            <div className="w-64 h-48 rounded-lg border border-hairline bg-surface-2 shadow-xl p-4 flex flex-col gap-3 -rotate-6 translate-y-4">
               <div className="h-4 w-1/2 bg-surface-3 rounded animate-pulse" />
               <div className="h-16 w-full bg-surface-3 rounded flex items-center justify-center text-ink-subtle"><LayoutDashboard className="w-6 h-6" /></div>
               <div className="h-16 w-full bg-surface-3 rounded" />
            </div>
            <div className="w-64 h-48 rounded-lg border border-accent/30 bg-surface-2 shadow-[0_0_30px_rgba(0,153,255,0.15)] p-4 flex flex-col gap-3 z-30">
               <div className="h-4 w-1/3 bg-accent/40 rounded" />
               <div className="flex-1 w-full bg-accent/10 rounded border border-accent/20 flex items-center justify-center">
                 <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white"><Shield className="w-6 h-6" /></div>
               </div>
            </div>
            <div className="w-64 h-48 rounded-lg border border-hairline bg-surface-2 shadow-xl p-4 flex flex-col gap-3 rotate-6 translate-y-4">
               <div className="h-4 w-2/3 bg-surface-3 rounded" />
               <div className="flex gap-2">
                 <div className="w-8 h-8 rounded-full bg-surface-3" />
                 <div className="flex-1 bg-surface-3 rounded" />
               </div>
               <div className="flex gap-2 mt-auto">
                 <div className="w-8 h-8 rounded-full bg-surface-3" />
                 <div className="flex-1 bg-surface-3 rounded flex items-center justify-center text-ink-subtle"><MessageSquare className="w-4 h-4" /></div>
               </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-32 border-t border-hairline">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-heading text-ink mb-4">
            Built for High Performance Teams
          </h2>
          <p className="text-ink-subtle max-w-xl mx-auto text-lg">
            Everything you need to orchestrate complex workflows without the clutter.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-hairline bg-surface-1 hover:bg-surface-2 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 border border-accent/20">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2 tracking-heading">Real-time Sync</h3>
            <p className="text-[14px] text-ink-subtle leading-relaxed">
              Experience zero-latency updates across all devices. WebSockets ensure your team always sees the latest changes instantly.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-hairline bg-surface-1 hover:bg-surface-2 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 border border-accent/20">
              <Layers className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2 tracking-heading">Infinite Canvas</h3>
            <p className="text-[14px] text-ink-subtle leading-relaxed">
              Organize projects your way with flexible kanban boards, list views, and rich text documents that scale with you.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-hairline bg-surface-1 hover:bg-surface-2 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 border border-accent/20">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2 tracking-heading">Enterprise Security</h3>
            <p className="text-[14px] text-ink-subtle leading-relaxed">
              Bank-grade encryption, secure OAuth, opaque refresh tokens, and strict role-based access control built right in.
            </p>
          </div>
        </div>
      </section>
      
      <footer className="border-t border-hairline py-10 px-6 text-center text-ink-subtle text-[13px] bg-surface-1">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-accent flex items-center justify-center font-bold text-[10px] text-white">S</div>
            <span className="font-semibold text-ink">Stride</span>
          </div>
          <p>© 2026 Stride Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
