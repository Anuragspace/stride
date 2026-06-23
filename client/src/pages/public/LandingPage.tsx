import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { SEO } from '@/components/SEO';

export default function LandingPage() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'tween',
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <div className="min-h-screen bg-canvas text-ink overflow-x-hidden font-sans selection:bg-accent/30 selection:text-ink relative flex flex-col">
      <SEO />
      {/* Background Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute -top-[400px] -left-[200px] w-[800px] h-[800px] rounded-full bg-gradient-to-r from-accent/[0.05] to-gradient-violet/[0.04] blur-3xl" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          className="absolute -bottom-[400px] -right-[200px] w-[800px] h-[800px] rounded-full bg-gradient-to-l from-gradient-magenta/[0.04] to-gradient-orange/[0.03] blur-3xl" 
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Top Navigation */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-50 w-full"
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-8 md:px-12">
          <div className="flex items-center">
            <img src="/stride-logo.png" alt="Stride" className="w-[180px] md:w-[260px] object-contain object-left" />
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-[14px] font-medium text-ink-subtle hover:text-ink transition-colors px-4 py-2 whitespace-nowrap rounded-full"
            >
              Log in
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="text-[14px] px-6 py-2.5 bg-surface-1 border border-hairline text-ink font-semibold rounded-full hover:bg-surface-2 hover:border-white/20 transition-all shadow-sm whitespace-nowrap"
            >
              Sign up
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto -mt-16 w-full">
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center w-full"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-hairline bg-surface-1/30 backdrop-blur-sm mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[12px] font-medium text-ink-subtle uppercase tracking-widest pl-1 pr-2">Stride v1.0 is live</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-[3rem] md:text-[4.5rem] lg:text-[5.5rem] font-bold tracking-tight leading-[1.05] text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/70 mb-8 max-w-4xl">
            Project management <br className="hidden md:block"/> made effortless.
          </motion.h1>

          <motion.p variants={itemVariants} className="text-ink-subtle max-w-2xl text-lg md:text-xl leading-relaxed mb-12 tracking-body">
            We help teams securely collaborate, organize tasks, and communicate in real-time globally. Without the clutter and noise.
          </motion.p>

          <motion.div variants={itemVariants} className="flex items-center justify-center w-full">
            <button 
              onClick={() => navigate('/signup')}
              className="group relative inline-flex items-center justify-center gap-2 px-10 py-4 md:py-5 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl duration-300 whitespace-nowrap text-[15px] md:text-[16px]"
            >
              Get Started 
              <ChevronRight className="w-4 h-4 text-black/70 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
