import { motion } from 'framer-motion';
import {
    Bell,
    Calendar,
    ChevronDown,
    LayoutGrid,
    Search,
    Settings,
    User
} from 'lucide-react';
import { ProjectCard } from '../components/dashboard/ProjectCard';
import { CalendarWidget } from '../components/dashboard/CalendarWidget';
import { ProfitChart } from '../components/dashboard/ProfitChart';

export function Dashboard() {
    return (
        <div className="h-full w-full overflow-y-auto p-4 md:p-8 text-white relative">

            {/* Header / Nav Bar */}
            <header className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center text-black">
                        <LayoutGrid className="w-6 h-6" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto bg-[#18181b] p-1.5 rounded-full border border-zinc-800">
                    {['Dashboard', 'Projects', 'Knowledge base', 'Users', 'Analytics'].map((item, i) => (
                        <button
                            key={item}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${i === 0 ? 'bg-[var(--primary)] text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                        >
                            {item}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium px-4 py-2 rounded-full border border-zinc-800 hover:bg-zinc-800 transition-colors">
                        <User className="w-4 h-4" /> Invite user
                    </button>
                    <button className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors relative">
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#030304]" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="User" />
                    </div>
                </div>
            </header>

            {/* Quick Stats Row */}
            <div className="flex items-center justify-between mb-8 px-2 overflow-x-auto pb-2">
                <h2 className="text-2xl font-medium">Projects <span className="text-zinc-500 text-lg font-normal">{'{88}'}</span></h2>

                <div className="flex gap-6 min-w-max">
                    <div className="flex items-center gap-3 bg-[#18181b] px-4 py-2 rounded-[1.5rem] border border-zinc-800">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                            <span className="text-lg">🔒</span>
                        </div>
                        <div>
                            <p className="text-xl font-bold font-mono">$ 21,339 <span className="text-[10px] bg-[#10b981]/20 text-[#10b981] px-1.5 py-0.5 rounded-full">+14% week</span></p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Total budget of all projects</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-[#18181b] px-4 py-2 rounded-[1.5rem] border border-zinc-800">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                            <span className="text-lg">🗓️</span>
                        </div>
                        <div>
                            <p className="text-xl font-bold font-mono">21,339 <span className="text-[10px] bg-[#10b981]/20 text-[#10b981] px-1.5 py-0.5 rounded-full">+178 today</span></p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Total completed tasks</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (Projects & Stats) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Projects Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ProjectCard
                            title="Decem App"
                            category="Finance"
                            completedTasks={98}
                            budget="$ 391,991"
                            team={['JD', 'AS', 'MR', 'CK']}
                            color="blue"
                            delay={0.1}
                        />
                        <ProjectCard
                            title="SkyLux"
                            category="Education"
                            completedTasks={12}
                            budget="$ 51,792"
                            team={['AL', 'MP', 'TR']}
                            color="orange"
                            delay={0.2}
                        />
                        <ProjectCard
                            title="Biofarm"
                            category="Healthcare"
                            completedTasks={19}
                            budget="$ 11,538"
                            team={['DR', 'RN']}
                            color="green"
                            delay={0.3}
                        />
                        <ProjectCard
                            title="PAD move"
                            category="Travel"
                            completedTasks={35}
                            budget="$ 21,688"
                            team={['TS']}
                            color="red"
                            delay={0.4}
                        />
                        <ProjectCard
                            title="DushMash"
                            category="Finance"
                            completedTasks={32}
                            budget="$ 31,955"
                            team={['CEO', 'CTO']}
                            color="purple"
                            delay={0.5}
                        />
                        <ProjectCard
                            title="Getstats"
                            category="Logistics"
                            completedTasks={80}
                            budget="$ 92,581"
                            team={['LG', 'SC', 'M', 'K', 'L']}
                            color="cyan"
                            delay={0.6}
                        />
                    </div>

                    {/* Bottom Row - Projects This Year */}
                    <div className="bg-[#18181b] rounded-[2rem] p-6 border border-zinc-800 flex items-center justify-between">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-white">Projects this year</h3>
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase">Average tasks value</p>
                                <p className="text-2xl font-bold font-mono text-[#10b981]">$ 568,338 <span className="text-xs text-zinc-600 font-sans font-normal ml-2">$ 321,339 less than last year</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase">New projects</p>
                                <p className="text-2xl font-bold font-mono text-[#10b981]">76</p>
                            </div>
                        </div>
                        <div className="hidden sm:block">
                            {/* Mini decorative chart or illustration could go here */}
                            <div className="flex gap-2 opacity-50">
                                {[40, 60, 30, 80, 50].map((h, i) => (
                                    <div key={i} className="w-4 bg-zinc-700 rounded-t-sm" style={{ height: h / 2 }} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column (Calendar & Charts) */}
                <div className="space-y-6">
                    <CalendarWidget />
                    <ProfitChart />
                </div>
            </div>

        </div>
    );
}
