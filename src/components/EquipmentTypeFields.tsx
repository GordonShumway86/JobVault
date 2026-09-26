import {
  EQUIPMENT_SUBTYPE_OPTIONS, SPLIT_SYSTEM_SUBTYPES,
  type EquipmentCategory, type UnitPosition,
} from '../types';
import { Field, Select, TextInput } from './Field';

const CUSTOM = '__custom__';

export interface EquipmentClassification {
  unit_position: UnitPosition | null;
  subtype: string | null;
}

// A category alone (e.g. "Split System") doesn't say enough to know what
// you're actually looking at — this renders whatever follow-up choice(s)
// that category needs: split systems ask which physical unit this record
// is first (outdoor/indoor each have their own nameplate), since the type
// choices genuinely differ between them; every other category with a
// preset list just asks for its type directly. Categories with no preset
// list (currently just "Other") render nothing.
export function EquipmentTypeFields({
  category, value, onChange,
}: {
  category: EquipmentCategory;
  value: EquipmentClassification;
  onChange: (next: EquipmentClassification) => void;
}) {
  const { unit_position, subtype } = value;

  if (category === 'split_system') {
    const options = unit_position ? SPLIT_SYSTEM_SUBTYPES[unit_position] : [];
    return (
      <>
        <Field label="Unit">
          <Select
            value={unit_position ?? ''}
            onChange={(e) => onChange({ unit_position: (e.target.value || null) as UnitPosition | null, subtype: null })}
          >
            <option value="">Select unit…</option>
            <option value="outdoor">Outdoor Unit</option>
            <option value="indoor">Indoor Unit</option>
          </Select>
        </Field>
        {unit_position && (
          <TypeSelect
            options={options}
            subtype={subtype}
            onChange={(next) => onChange({ unit_position, subtype: next })}
          />
        )}
      </>
    );
  }

  const options = EQUIPMENT_SUBTYPE_OPTIONS[category];
  if (!options) return null;
  return (
    <TypeSelect
      options={options}
      subtype={subtype}
      onChange={(next) => onChange({ unit_position: null, subtype: next })}
    />
  );
}

// `subtype === null` means nothing picked yet; `subtype === ''` means
// "Other" was picked but nothing typed into it yet — kept distinct from
// null so re-selecting "Other" doesn't fall back out of custom mode the
// instant the text is empty (an earlier version of this had that bug).
function TypeSelect({
  options, subtype, onChange,
}: {
  options: string[];
  subtype: string | null;
  onChange: (subtype: string | null) => void;
}) {
  const isCustom = subtype !== null && !options.includes(subtype);
  return (
    <>
      <Field label="Type">
        <Select
          value={isCustom ? CUSTOM : subtype ?? ''}
          onChange={(e) => onChange(e.target.value === CUSTOM ? '' : e.target.value || null)}
        >
          <option value="">Select type…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
          <option value={CUSTOM}>Other (type below)</option>
        </Select>
      </Field>
      {isCustom && (
        <Field label="Type (other)">
          <TextInput value={subtype ?? ''} onChange={(e) => onChange(e.target.value)} />
        </Field>
      )}
    </>
  );
}
