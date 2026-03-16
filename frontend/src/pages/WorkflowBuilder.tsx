import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Play, CheckCircle } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import api from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

interface WorkflowRule {
  id?: string;
  entityType: string;
  triggerEvent: string;
  condition: object;
  actionType: string;
  actionValue: string;
  isActive: boolean;
}

const ENTITY_TYPES = ['PURCHASE_ORDER', 'EXPENSE_CLAIM', 'INVOICE'];
const TRIGGER_EVENTS = ['ON_CREATE', 'ON_STATUS_CHANGE'];
const ACTION_TYPES = ['REQUIRE_APPROVAL', 'SEND_NOTIFICATION'];

export const WorkflowBuilder = () => {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await api.get('/workflows');
      setRules(res.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch rules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = () => {
    setRules([
      ...rules,
      {
        entityType: 'PURCHASE_ORDER',
        triggerEvent: 'ON_STATUS_CHANGE',
        condition: { field: 'totalAmount', operator: '>', value: 0 },
        actionType: 'REQUIRE_APPROVAL',
        actionValue: 'MANAGER',
        isActive: true,
      },
    ]);
  };

  const handleUpdateRule = (index: number, field: string, value: string | boolean | object) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    setRules(updated);
  };

  const handleSaveRule = async (index: number) => {
    try {
      const rule = rules[index];
      if (rule.id) {
        await api.put(`/workflows/${rule.id}`, rule);
        toast.success('Rule updated successfully');
      } else {
        const res = await api.post('/workflows', rule);
        const updated = [...rules];
        updated[index] = res.data.data;
        setRules(updated);
        toast.success('Rule created successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save rule');
    }
  };

  const handleDeleteRule = async (index: number) => {
    try {
      const rule = rules[index];
      if (rule.id) {
        await api.delete(`/workflows/${rule.id}`);
        toast.success('Rule deleted successfully');
      }
      setRules(rules.filter((_, i) => i !== index));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete rule');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[var(--text-secondary)]">Loading workflow rules...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Workflow Engine</h1>
          <p className="text-[var(--text-secondary)]">Create and manage rule-based business logic workflows to automate approvals and behavior.</p>
        </div>
        <button
          onClick={handleCreateRule}
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Rule
        </button>
      </div>

      <div className="space-y-4">
        {rules.map((rule, idx) => (
          <Card key={rule.id || idx} className="border border-[var(--border-color)] overflow-hidden">
            <CardHeader className="bg-[var(--bg-card-hover)] flex flex-row items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Play size={18} className="text-[var(--primary)]" />
                <CardTitle className="text-base">Rule {idx + 1}</CardTitle>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveRule(idx)}
                  className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                  title="Save Rule"
                >
                  <Save size={18} />
                </button>
                <button
                  onClick={() => handleDeleteRule(idx)}
                  className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Delete Rule"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Entity Type</label>
                    <select
                      value={rule.entityType}
                      onChange={(e) => handleUpdateRule(idx, 'entityType', e.target.value)}
                      className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    >
                      {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Trigger Event</label>
                    <select
                      value={rule.triggerEvent}
                      onChange={(e) => handleUpdateRule(idx, 'triggerEvent', e.target.value)}
                      className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    >
                      {TRIGGER_EVENTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Action</label>
                    <div className="flex gap-3">
                      <select
                        value={rule.actionType}
                        onChange={(e) => handleUpdateRule(idx, 'actionType', e.target.value)}
                        className="flex-1 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      >
                        {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        type="text"
                        value={rule.actionValue}
                        onChange={(e) => handleUpdateRule(idx, 'actionValue', e.target.value)}
                        placeholder="e.g. MANAGER"
                        className="flex-1 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Condition (JSON Map)</label>
                    <textarea
                      value={JSON.stringify(rule.condition)}
                      onChange={(e) => {
                        try {
                          handleUpdateRule(idx, 'condition', JSON.parse(e.target.value));
                        } catch {
                            // ignore malformed JSON while typing
                        }
                      }}
                      rows={2}
                      className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-lg p-2.5 text-sm font-mono text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
                <input
                  type="checkbox"
                  id={`active-${idx}`}
                  checked={rule.isActive}
                  onChange={(e) => handleUpdateRule(idx, 'isActive', e.target.checked)}
                  className="rounded border-[var(--border-color)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <label htmlFor={`active-${idx}`} className="text-sm font-medium text-[var(--text-primary)] cursor-pointer">
                  Rule is Active
                </label>
                {rule.id && (
                  <div className="ml-auto flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <CheckCircle size={14} /> Synchronized
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {rules.length === 0 && (
          <div className="text-center py-16 bg-[var(--bg-card)] border border-dashed border-[var(--border-color)] rounded-xl">
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Workflow Rules</h3>
            <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">Create a rule to automate business behavior, such as requiring approvals based on limits.</p>
            <button
              onClick={handleCreateRule}
              className="inline-flex items-center gap-2 bg-[var(--primary)] text-white px-5 py-2.5 rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
            >
              <Plus size={18} />
              Create First Rule
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
