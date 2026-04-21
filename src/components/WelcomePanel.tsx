import { BookOpen } from 'lucide-react';

export default function WelcomePanel() {
  return (
    <section className="col-span-12 md:col-span-8 bg-[#F9FAFB] p-6 md:p-12 flex flex-col justify-center items-center">
      <div className="max-w-md w-full px-4 text-center space-y-6 md:space-y-8">
        <div className="inline-block p-3 md:p-4 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <BookOpen className="w-8 h-8 md:w-12 md:h-12" />
        </div>
        <div className="space-y-3 md:space-y-4">
          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter">System Ready</h3>
          <p className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
            Enter your vocabulary on the left panel to begin a high-intensity dictation session.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div className="p-3 md:p-4 border-2 border-dashed border-gray-300">
            <span className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 block mb-1">Shortcut</span>
            <span className="text-xs font-black uppercase font-mono bg-white px-2 py-1 border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Enter</span>
            <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase block mt-2">Next Entry</span>
          </div>
          <div className="p-3 md:p-4 border-2 border-dashed border-gray-300">
            <span className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 block mb-1">Audio</span>
            <span className="text-xs font-black uppercase font-mono bg-white px-2 py-1 border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Manual</span>
            <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase block mt-2">Control Flow</span>
          </div>
        </div>
      </div>
    </section>
  );
}
