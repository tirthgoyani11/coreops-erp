import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProjectCardProps {
    title: string;
    category: string;
    completedTasks: number;
    totalTasks?: number;
    budget: string;
    team: string[]; // Array of avatar image URLs or initials
    color: 'blue' | 'orange' | 'purple' | 'green' | 'red' | 'cyan';
    delay?: number;
}

export function ProjectCard({ title, category, completedTasks, budget, team, color, delay = 0 }: ProjectCardProps) {
    const getTheme = (c: string) => {
        const themes: Record<string, string> = {
            blue: "bg-[#2563eb] text-white",
            orange: "bg-[#ea580c] text-white",
            purple: "bg-[#9333ea] text-white",
            green: "bg-[#16a34a] text-white",
            red: "bg-[#dc2626] text-white",
            cyan: "bg-[#06b6d4] text-white",
        };
        return themes[c] || themes.blue;
    };

    const themeClass = getTheme(color);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className={`relative rounded-[2rem] p-6 ${themeClass} overflow-hidden group shadow-lg`}
        >
            {/* Top Row */}
            <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 border border-white/20 px-2 py-1 rounded-full">
                    #{category}
                </span>
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowUpRight className="w-5 h-5" />
                </button>
            </div>

            {/* Title & Stats */}
            <div className="mb-8">
                <h3 className="text-2xl font-bold mb-1 leading-tight">{title}</h3>
                <p className="text-sm opacity-80 font-medium">Completed tasks: {completedTasks}</p>
            </div>

            {/* Bottom Row: Budget & Team */}
            <div className="flex items-end justify-between">
                <div>
                    <h4 className="text-2xl font-bold font-mono tracking-tight">{budget}</h4>
                </div>

                <div className="flex -space-x-3">
                    {team.slice(0, 3).map((initial, i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center bg-white/10 backdrop-blur-sm text-xs font-bold shadow-sm">
                            {initial}
                        </div>
                    ))}
                    {team.length > 3 && (
                        <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center bg-black/20 backdrop-blur-sm text-xs font-bold">
                            +{team.length - 3}
                        </div>
                    )}
                </div>
            </div>

            {/* Decorative BG Shapes */}
            <div className="absolute -right-4 -top-4 w-32 h-32 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-black/5 blur-xl" />
        </motion.div>
    );
}
