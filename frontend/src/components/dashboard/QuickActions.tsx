import { memo } from 'react';
import type { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Building2,
    UserPlus,
    FileText,
    Download,
    Settings,
    Bell,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface QuickAction {
    label: string;
    icon: ComponentType<LucideProps>;
    href: string;
    color?: string;
}

const defaultActions: QuickAction[] = [
    { label: 'Create Office', icon: Building2, href: '/offices/new', color: 'var(--primary)' },
    { label: 'Add User', icon: UserPlus, href: '/users/new', color: '#3B82F6' },
    { label: 'Generate Report', icon: FileText, href: '/analytics', color: '#F97316' },
    { label: 'Export Data', icon: Download, href: '/settings/export', color: '#10B981' },
    { label: 'Notifications', icon: Bell, href: '/notifications', color: '#EC4899' },
    { label: 'Settings', icon: Settings, href: '/settings', color: '#8B5CF6' },
];

interface QuickActionsProps {
    actions?: QuickAction[];
    title?: string;
}

export const QuickActions = memo(function QuickActions({
    actions = defaultActions,
    title = 'Quick Actions',
}: QuickActionsProps) {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#18181b] border border-white/5 rounded-2xl p-6"
        >
            <h3 className="text-white font-medium mb-4">{title}</h3>

            <div className="space-y-2">
                {actions.map((action, index) => (
                    <motion.button
                        key={action.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => navigate(action.href)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all group"
                    >
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                            style={{
                                backgroundColor: `${action.color}20`,
                            }}
                        >
                            <action.icon
                                className="w-4 h-4 transition-colors"
                                style={{ color: action.color }}
                            />
                        </div>
                        <span className="text-sm font-medium text-[var(--text-muted)] group-hover:text-white transition-colors">
                            {action.label}
                        </span>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
});

export default QuickActions;
