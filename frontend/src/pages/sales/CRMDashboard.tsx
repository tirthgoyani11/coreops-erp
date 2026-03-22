import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, ShoppingCart, TrendingUp, ArrowRight } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

type Customer = {
    id: string;
    name: string;
    status?: string;
    outstanding?: number;
};

type Quotation = {
    id: string;
    quotationNumber: string;
    totalAmount?: number;
    status?: string;
    customer?: { name?: string };
    createdAt?: string;
};

type SalesOrder = {
    id: string;
    orderNumber: string;
    totalAmount?: number;
    status?: string;
    customer?: { name?: string };
    createdAt?: string;
};

type Campaign = {
    id: string;
    name: string;
    status: string;
    budgetAmount: number;
};

type SalesTerritory = {
    id: string;
    code: string;
    name: string;
    status: string;
};

type AccountPlan = {
    id: string;
    planName: string;
    status: string;
    customer?: { name?: string };
};

type PartnerChannel = {
    id: string;
    channelName: string;
    status: string;
    partnerType?: string;
};

export function CRMDashboard() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [territories, setTerritories] = useState<SalesTerritory[]>([]);
    const [accountPlans, setAccountPlans] = useState<AccountPlan[]>([]);
    const [partnerChannels, setPartnerChannels] = useState<PartnerChannel[]>([]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [c, q, s, cam, ter, plans, channels] = await Promise.allSettled([
                    api.get('/customers', { params: { limit: 200 } }),
                    api.get('/quotations', { params: { limit: 200 } }),
                    api.get('/sales-orders', { params: { limit: 200 } }),
                    api.get('/crm/campaigns'),
                    api.get('/crm/territories'),
                    api.get('/crm/account-plans'),
                    api.get('/crm/partner-channels'),
                ]);

                setCustomers(c.status === 'fulfilled' ? (c.value.data?.data || []) : []);
                setQuotations(q.status === 'fulfilled' ? (q.value.data?.data || []) : []);
                setOrders(s.status === 'fulfilled' ? (s.value.data?.data || []) : []);
                setCampaigns(cam.status === 'fulfilled' ? (cam.value.data?.data || []) : []);
                setTerritories(ter.status === 'fulfilled' ? (ter.value.data?.data || []) : []);
                setAccountPlans(plans.status === 'fulfilled' ? (plans.value.data?.data || []) : []);
                setPartnerChannels(channels.status === 'fulfilled' ? (channels.value.data?.data || []) : []);
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, []);

    const summary = useMemo(() => {
        const activeCustomers = customers.filter((c) => c.status === 'ACTIVE').length;
        const quoteValue = quotations.reduce((sum, q) => sum + Number(q.totalAmount || 0), 0);
        const acceptedQuotes = quotations.filter((q) => q.status === 'ACCEPTED').length;
        const orderValue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
        const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;
        const conversionRate = quotations.length > 0 ? (acceptedQuotes / quotations.length) * 100 : 0;
        const campaignBudget = campaigns.reduce((sum, c) => sum + Number(c.budgetAmount || 0), 0);

        return {
            totalCustomers: customers.length,
            activeCustomers,
            totalQuotes: quotations.length,
            acceptedQuotes,
            quoteValue,
            totalOrders: orders.length,
            deliveredOrders,
            orderValue,
            conversionRate,
            campaigns: campaigns.length,
            territories: territories.length,
            accountPlans: accountPlans.length,
            partnerChannels: partnerChannels.length,
            campaignBudget,
        };
    }, [customers, quotations, orders, campaigns, territories, accountPlans, partnerChannels]);

    const recentQuotes = [...quotations]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);

    const recentOrders = [...orders]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);

    if (loading) {
        return <div className="h-96 animate-pulse bg-[var(--bg-card)] rounded-3xl" />;
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">CRM Dashboard</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Sales pipeline health, quotation conversion, and order momentum.
                </p>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Customers</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{summary.totalCustomers}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Active: {summary.activeCustomers}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Quotations</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{summary.totalQuotes}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Accepted: {summary.acceptedQuotes}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Pipeline Value</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{formatCurrency(summary.quoteValue)}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Order Value: {formatCurrency(summary.orderValue)}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Conversion</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{summary.conversionRate.toFixed(1)}%</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Delivered Orders: {summary.deliveredOrders}</p>
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Campaigns</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{summary.campaigns}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Budget: {formatCurrency(summary.campaignBudget)}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Territories</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{summary.territories}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Active market coverage</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Account Plans</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{summary.accountPlans}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Strategic customer plans</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Partner Channels</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{summary.partnerChannels}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Distribution + alliance network</p>
                </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Recent Quotations
                        </h2>
                        <button className="text-xs text-[var(--primary)]" onClick={() => navigate('/sales/quotations')}>View All</button>
                    </div>
                    <div className="space-y-2">
                        {recentQuotes.length === 0 ? (
                            <p className="text-sm text-[var(--text-secondary)]">No quotations found.</p>
                        ) : (
                            recentQuotes.map((q) => (
                                <div key={q.id} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">{q.quotationNumber}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">{q.customer?.name || 'Customer'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(Number(q.totalAmount || 0))}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">{q.status || 'DRAFT'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" /> Recent Sales Orders
                        </h2>
                        <button className="text-xs text-[var(--primary)]" onClick={() => navigate('/sales/orders')}>View All</button>
                    </div>
                    <div className="space-y-2">
                        {recentOrders.length === 0 ? (
                            <p className="text-sm text-[var(--text-secondary)]">No sales orders found.</p>
                        ) : (
                            recentOrders.map((o) => (
                                <div key={o.id} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">{o.orderNumber}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">{o.customer?.name || 'Customer'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(Number(o.totalAmount || 0))}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">{o.status || 'DRAFT'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Campaign Operations</h2>
                    <div className="space-y-2">
                        {campaigns.slice(0, 5).map((item) => (
                            <div key={item.id} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.name}</p>
                                    <p className="text-xs text-[var(--text-secondary)]">{item.status}</p>
                                </div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(Number(item.budgetAmount || 0))}</p>
                            </div>
                        ))}
                        {campaigns.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No campaigns available yet.</p> : null}
                    </div>
                </div>

                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Account Plans and Partners</h2>
                    <div className="space-y-2">
                        {accountPlans.slice(0, 3).map((item) => (
                            <div key={item.id} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                <p className="text-sm font-medium text-[var(--text-primary)]">{item.planName}</p>
                                <p className="text-xs text-[var(--text-secondary)]">{item.customer?.name || 'Customer'} • {item.status}</p>
                            </div>
                        ))}
                        {partnerChannels.slice(0, 3).map((item) => (
                            <div key={item.id} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-3">
                                <p className="text-sm font-medium text-[var(--text-primary)]">{item.channelName}</p>
                                <p className="text-xs text-[var(--text-secondary)]">{item.partnerType || 'Partner'} • {item.status}</p>
                            </div>
                        ))}
                        {accountPlans.length === 0 && partnerChannels.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No account plans or partner channels available yet.</p> : null}
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                        onClick={() => navigate('/sales/customers')}
                        className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-4 text-left hover:bg-[var(--bg-card-hover)]"
                    >
                        <p className="text-sm font-semibold text-[var(--text-primary)] inline-flex items-center gap-2"><Users className="w-4 h-4" /> Customer Master</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Manage customers and limits.</p>
                    </button>
                    <button
                        onClick={() => navigate('/sales/quotations')}
                        className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-4 text-left hover:bg-[var(--bg-card-hover)]"
                    >
                        <p className="text-sm font-semibold text-[var(--text-primary)] inline-flex items-center gap-2"><FileText className="w-4 h-4" /> Quotation Desk</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Track and convert quotations.</p>
                    </button>
                    <button
                        onClick={() => navigate('/sales/orders')}
                        className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-overlay)] p-4 text-left hover:bg-[var(--bg-card-hover)]"
                    >
                        <p className="text-sm font-semibold text-[var(--text-primary)] inline-flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Order Fulfillment</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Move confirmed orders to delivery.</p>
                    </button>
                </div>
                <div className="flex justify-end mt-3">
                    <button onClick={() => navigate('/sales/orders')} className="text-sm text-[var(--primary)] inline-flex items-center gap-1">
                        Open Sales Workspace <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </section>
        </div>
    );
}
