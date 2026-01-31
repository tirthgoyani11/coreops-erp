import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function CalendarWidget() {
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    const activeDays = [3, 7, 12, 18, 24, 28]; // Mock data

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#18181b] rounded-[2rem] p-6 border border-zinc-800"
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Calendar <span className="text-zinc-500 text-sm font-normal">{'{April}'}</span></h3>
                <div className="flex gap-2">
                    <button className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400"><ChevronLeft className="w-4 h-4" /></button>
                    <button className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-xs text-zinc-600 font-bold">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {days.map((day) => (
                    <div key={day} className="aspect-square flex flex-col items-center justify-center relative group cursor-pointer">
                        <span className={`text-sm ${activeDays.includes(day) ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                            {day}
                        </span>

                        {/* Event Indicator */}
                        {activeDays.includes(day) && (
                            <div className="mt-1 flex -space-x-1">
                                {day % 2 === 0 ? (
                                    <>
                                        <div className="w-5 h-5 rounded-full border border-[#18181b] bg-zinc-800 overflow-hidden relative">
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${day}`} alt="" />
                                        </div>
                                        <div className="w-5 h-5 rounded-full border border-[#18181b] bg-zinc-700 overflow-hidden relative">
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${day + 5}`} alt="" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                                )}
                            </div>
                        )}

                        {/* Hover Effect */}
                        <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-zinc-700 transition-colors" />
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
