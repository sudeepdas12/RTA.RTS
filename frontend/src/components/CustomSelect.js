import React from 'react';
import Select from 'react-select';

const buildStyles = (isDarker = false) => ({
  control: (provided, state) => ({
    ...provided,
    border: state.isFocused ? '2px solid #8860D0' : '2px solid #cbd5e1',
    borderRadius: '12px',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(136,96,208,0.12)' : 'none',
    minHeight: '44px',
    background: '#fff',
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
    '&:hover': {
      borderColor: '#8860D0',
    },
  }),
  placeholder: (provided) => ({ ...provided, color: '#6b7280', fontWeight: 500 }),
  singleValue: (provided) => ({ ...provided, color: '#1e293b', fontWeight: 500 }),
  option: (provided, state) => ({
    ...provided,
    background: state.isSelected
      ? (isDarker ? 'linear-gradient(135deg,#7c3aed,#6b46c1)' : 'linear-gradient(135deg,#e9d5ff,#c7b9f5)')
      : state.isFocused ? (isDarker ? '#f0eaff' : '#f8f4ff') : 'transparent',
    color: state.isSelected ? (isDarker ? '#ffffff' : '#1e293b') : '#1e293b',
    fontWeight: state.isSelected ? 700 : 500,
    padding: '10px 12px',
    borderRadius: '8px',
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: '12px',
    boxShadow: isDarker ? '0 10px 30px rgba(107,70,193,0.12)' : '0 8px 30px rgba(136,96,208,0.08)',
    padding: 8,
    border: '1px solid rgba(136,96,208,0.06)',
    background: isDarker ? 'linear-gradient(135deg,#efe6ff,#e0d6ff)' : 'linear-gradient(135deg,#ffffff,#f6f0ff)',
  }),
  menuList: (provided) => ({
    ...provided,
    maxHeight: '320px',
    padding: '4px',
    background: 'transparent',
  }),
});

export default function CustomSelect(props) {
  const { options, value, onChange, placeholder, isDisabled, isSearchable, isClearable, variant } = props;
  const isDarker = variant === 'darker';

  // Accept both plain arrays of strings or objects
  const normalizedOptions = (options || []).map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt);

  // react-select requires the `value` prop to be an object from the options array (or null).
  // We need to support strings, numbers, or already-normalized objects.
  let normalizedValue;
  if (value === undefined || value === null || value === '') {
    normalizedValue = null;
  } else if (typeof value === 'object') {
    // assume it's already a valid option object
    normalizedValue = value;
  } else {
    // for primitive values (string, number, etc.) try to find a matching option
    normalizedValue = normalizedOptions.find(o => String(o.value) === String(value)) || { value, label: String(value) };
  }

  return (
    <Select
      options={normalizedOptions}
      value={normalizedValue}
      onChange={(opt) => onChange && onChange(opt ? opt.value : '')}
      placeholder={placeholder}
      styles={{...buildStyles(isDarker), menuPortal: (provided) => ({ ...provided, zIndex: 120000 })}}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuPosition="fixed"
      isDisabled={isDisabled}
      isSearchable={isSearchable !== false}
      isClearable={isClearable === true}
      className={variant === 'darker' ? 'rta-select--darker' : undefined}
    />
  );
}
