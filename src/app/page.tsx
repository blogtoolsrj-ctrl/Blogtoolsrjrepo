
import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-background selection:bg-accent selection:text-accent-foreground">
      <Dashboard />
      
      {/* Footer Industrial Decoration */}
      <footer className="py-12 border-t border-border mt-20 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <p className="text-xs font-mono tracking-widest uppercase">System Status: Online</p>
          </div>
          <p className="text-[10px] font-mono tracking-tight uppercase">
            Built with GenAI & Turbopack Core
          </p>
        </div>
      </footer>
    </main>
  );
}
