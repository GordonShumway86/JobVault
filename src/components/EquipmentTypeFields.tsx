import {
  SYSTEM_TYPE_OPTIONS, COMPONENT_TYPE_OPTIONS, SPLIT_SYSTEM_CONFIGURATIONS,
  type SystemCategory, type ComponentPosition,
} from '../types';
import { Field, Select, TextInput } from './Field';

const CUSTOM = '__custom__';

// Shared "pick from a preset list, or Other + free text" select — used for
// both System Type and Component Type so nothing Ed runs into in the field
// is ever a dead end.
function TypeSelect({
  label, options, value, onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  const isCustom = value !== '' && !options.includes(value);
  return (
    <>
      <Field label={label}>
        <Select
          value={isCustom ? CUSTOM : value}
          onChange={(e) => onChange(e.target.value === CUSTOM ? '' : e.target.value)}
        >
          <option value="">Select…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
          <option value={CUSTOM}>Other (type below)</option>
        </Select>
      </Field>
      {isCustom && (
        <Field label={`${label} (other)`}>
          <TextInput value={value} onChange={(e) => onChange(e.target.value)} />
        </Field>
      )}
    </>
  );
}

// System Type follows straight from System Category — no position step.
// Split systems additionally get a "System Configuration" field (Single-
// stage/Multi-stage/Dual-Fuel/Twinned); every other category doesn't.
export function SystemTypeFields({
  category, systemType, configuration, onChange,
}: {
  category: SystemCategory;
  systemType: string;
  configuration: string | null;
  onChange: (next: { systemType: string; configuration: string | null }) => void;
}) {
  const options = SYSTEM_TYPE_OPTIONS[category];
  return (
    <>
      <TypeSelect
        label="System Type"
        options={options}
        value={systemType}
        onChange={(next) => onChange({ systemType: next, configuration })}
      />
      {category === 'split_system' && (
        <Field label="System Configuration">
          <Select
            value={configuration ?? ''}
            onChange={(e) => onChange({ systemType, configuration: e.target.value || null })}
          >
            <option value="">Select…</option>
            {SPLIT_SYSTEM_CONFIGURATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
      )}
    </>
  );
}

export interface ComponentClassification {
  position: ComponentPosition | null;
  componentType: string;
}

// A System's category decides which Component Types are allowed on it, and
// whether those types are further split by physical position (split
// systems and ductless/VRF have genuinely different indoor vs. outdoor
// component types, each with its own nameplate) — every other category
// just offers one flat Component Type list.
export function ComponentTypeFields({
  category, value, onChange,
}: {
  category: SystemCategory;
  value: ComponentClassification;
  onChange: (next: ComponentClassification) => void;
}) {
  const config = COMPONENT_TYPE_OPTIONS[category];
  const { position, componentType } = value;

  if (config.positioned) {
    const options = position === 'outdoor' ? config.outdoorTypes : position === 'indoor' ? config.indoorTypes : [];
    return (
      <>
        <Field label="Position">
          <Select
            value={position ?? ''}
            onChange={(e) => onChange({ position: (e.target.value || null) as ComponentPosition | null, componentType: '' })}
          >
            <option value="">Select position…</option>
            <option value="outdoor">Outdoor</option>
            <option value="indoor">Indoor</option>
          </Select>
        </Field>
        {position && (
          <TypeSelect
            label="Component Type"
            options={options}
            value={componentType}
            onChange={(next) => onChange({ position, componentType: next })}
          />
        )}
      </>
    );
  }

  if (!config.types.length) return null;
  return (
    <TypeSelect
      label="Component Type"
      options={config.types}
      value={componentType}
      onChange={(next) => onChange({ position: null, componentType: next })}
    />
  );
}
