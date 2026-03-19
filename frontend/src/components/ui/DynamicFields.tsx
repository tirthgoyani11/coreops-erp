import { useState, useEffect } from 'react';
import api from '../../lib/api';

export interface CustomFieldDef {
  id: string;
  entityType: string;
  name: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT';
  isRequired: boolean;
  options?: any;
}

export interface CustomFieldValue {
  fieldDefId: string;
  value: string;
}

interface DynamicFieldsProps {
  entityType: string;
  entityId?: string;
  values: CustomFieldValue[];
  onChange: (values: CustomFieldValue[]) => void;
  className?: string;
}

export const DynamicFields = ({ entityType, entityId: _entityId, values, onChange, className = '' }: DynamicFieldsProps) => {
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDefs();
  }, [entityType]);

  const fetchDefs = async () => {
    try {
      const res = await api.get(`/custom-fields/defs?entityType=${entityType}`);
      setDefs(res.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load custom fields', error);
      setLoading(false);
    }
  };

  const handleValueChange = (fieldDefId: string, newValue: string) => {
    const existingIndex = values.findIndex(v => v.fieldDefId === fieldDefId);
    let newValues = [...values];

    if (existingIndex >= 0) {
      newValues[existingIndex] = { ...newValues[existingIndex], value: newValue };
    } else {
      newValues.push({ fieldDefId, value: newValue });
    }

    onChange(newValues);
  };

  const getValue = (fieldDefId: string) => {
    return values.find(v => v.fieldDefId === fieldDefId)?.value || '';
  };

  if (loading) return <div className="animate-pulse flex space-x-4"><div className="h-4 bg-slate-200 rounded w-full"></div></div>;

  if (defs.length === 0) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">Custom Fields</h3>
      {defs.map((def) => {
        const value = getValue(def.id);

        return (
          <div key={def.id}>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              {def.name} {def.isRequired && <span className="text-red-500">*</span>}
            </label>

            {def.type === 'STRING' && (
              <input
                type="text"
                required={def.isRequired}
                value={value}
                onChange={(e) => handleValueChange(def.id, e.target.value)}
                className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            )}

            {def.type === 'NUMBER' && (
              <input
                type="number"
                required={def.isRequired}
                value={value}
                onChange={(e) => handleValueChange(def.id, e.target.value)}
                className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            )}

            {def.type === 'DATE' && (
              <input
                type="date"
                required={def.isRequired}
                value={value}
                onChange={(e) => handleValueChange(def.id, e.target.value)}
                className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            )}

            {def.type === 'BOOLEAN' && (
              <select
                required={def.isRequired}
                value={value}
                onChange={(e) => handleValueChange(def.id, e.target.value)}
                className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              >
                <option value="">Select...</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            )}

            {def.type === 'SELECT' && (
              <select
                required={def.isRequired}
                value={value}
                onChange={(e) => handleValueChange(def.id, e.target.value)}
                className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              >
                <option value="">Select...</option>
                {Array.isArray(def.options) && def.options.map((opt: any, idx: number) => (
                  <option key={idx} value={String(opt)}>{String(opt)}</option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
};
