import { motion } from 'framer-motion';
import { ArrowUpRight, Minimize2, MoreHorizontal } from 'lucide-react';

export function ProfitChart() {
    const data = [40, 65, 50, 85, 30, 95, 45, 60]; // Mock data percentages
    const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#18181b] rounded-[2rem] p-6 border border-zinc-800 relative overflow-hidden"
        >
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">Yearly profit <span className="text-zinc-500 text-sm font-normal">{'{20%}'}</span></h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">Average</span>
                        <span className="text-xs font-mono text-zinc-500">$ 568,338</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"><Minimize2 className="w-4 h-4" /></button>
                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"><ArrowUpRight className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-48 flex items-end justify-between gap-2 px-2">
                {data.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative">
                        {/* Tooltip */}
                        <div className={`absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--primary)] text-black text-[10px] font-bold px-2 py-1 rounded mb-2 whitespace-nowrap z-10 pointer-events-none`}>
                            $ {h}k
                        </div>

                        {/* Bar */}
                        <div className="w-full bg-zinc-800 rounded-t-xl relative overflow-hidden group-hover:bg-[#10b981]/20 transition-colors" style={{ height: `${h}%` }}>
                            {/* Fill Effect */}
                            {i === 5 && (
                                <div className="absolute bottom-0 w-full bg-[var(--primary)] h-full animate-pulse opacity-80" />
                            )}
                        </div>

                        <span className="text-[10px] text-zinc-600 font-mono uppercase">{months[i]}</span>
                    </div>
                ))}
            </div>

            {/* Highlight bubble for peak */}
            <div className="absolute top-[40%] left-[62%] bg-[var(--primary)] text-black text-xs font-bold px-3 py-1 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-bounce">
                $ 21,339
            </div>
        </motion.div>
    );
}
