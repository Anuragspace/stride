import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center relative overflow-hidden">
      {/* Gradient background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[400px] -left-[200px] w-[800px] h-[800px] rounded-full bg-gradient-to-r from-accent/[0.08] to-gradient-violet/[0.06] blur-3xl" />
        <div className="absolute -bottom-[400px] -right-[200px] w-[800px] h-[800px] rounded-full bg-gradient-to-l from-gradient-magenta/[0.06] to-gradient-orange/[0.04] blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px] mx-[20px]"
      >
        {/* Logo */}
        <div className="text-center mb-[40px] flex flex-col items-center">
          <img src="/stride-logo.png" alt="Stride" className="h-12 w-auto object-contain mb-[4px]" />
          <p className="text-[14px] text-ink-muted mt-[4px]">
            Project management, reimagined
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-surface-1 border border-hairline rounded-xl p-[32px] shadow-2xl shadow-black/20">
          <Outlet />
        </div>
      </motion.div>
    </div>
  );
}
