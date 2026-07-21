import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  adToBs,
  bsToAd,
  formatBsDateNp,
  toNepaliDigits,
  BS_MONTHS_NP,
  BS_DAYS_NP,
  getBsMonthDays,
} from '../utils/nepaliDate';

const toDateInputValue = (date) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromDateInputValue = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const nextBsMonth = (year, month) => {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
};

const prevBsMonth = (year, month) => {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
};

const AppDatePicker = ({
  selected,
  onChange,
  className,
  placeholderText,
  isClearable,
  disabled,
  ...rest
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    const bs = selected ? adToBs(selected) : adToBs(new Date());
    return bs.year;
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const bs = selected ? adToBs(selected) : adToBs(new Date());
    return bs.month;
  });
  const wrapperRef = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    const bs = selected ? adToBs(selected) : adToBs(new Date());
    setViewYear(bs.year);
    setViewMonth(bs.month);
  }, [selected]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (wrapperRef.current && wrapperRef.current.contains(event.target)) {
        return;
      }
      if (pickerRef.current && pickerRef.current.contains(event.target)) {
        return;
      }
      setShowPicker(false);
    };
    if (showPicker) {
      document.addEventListener('mousedown', closeOnOutsideClick);
      return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }
  }, [showPicker]);

  const handleSelect = (day) => {
    const date = bsToAd({ year: viewYear, month: viewMonth, day });
    onChange(date);
    setShowPicker(false);
  };

  const selectedBs = selected ? adToBs(selected) : null;
  const selectedBsLabel = selected ? formatBsDateNp(selectedBs) : '';
  const selectedAdLabel = selected ? toDateInputValue(selected) : '';

  const daysInMonth = getBsMonthDays(viewYear, viewMonth);
  const firstDayOfMonth = bsToAd({ year: viewYear, month: viewMonth, day: 1 }).getDay();
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i += 1) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(day);
  }

  const [popupStyle, setPopupStyle] = useState({});

  useEffect(() => {
    if (!showPicker || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setPopupStyle({
      position: 'absolute',
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
      width: rect.width,
      zIndex: 9999,
    });
  }, [showPicker]);

  const picker = (
    <div ref={pickerRef} className="app-date-picker-popup" style={popupStyle}>
      <div className="app-date-picker-header">
        <button type="button" className="btn btn-link p-1" onClick={() => {
          const prev = prevBsMonth(viewYear, viewMonth);
          setViewYear(prev.year);
          setViewMonth(prev.month);
        }}>←</button>
        <div className="app-date-picker-header-title">
          {BS_MONTHS_NP[viewMonth - 1]} {toNepaliDigits(viewYear)}
        </div>
        <button type="button" className="btn btn-link p-1" onClick={() => {
          const next = nextBsMonth(viewYear, viewMonth);
          setViewYear(next.year);
          setViewMonth(next.month);
        }}>→</button>
      </div>
      <div className="app-date-picker-weekdays">
        {BS_DAYS_NP.map((dayName) => (
          <div key={dayName} className="app-date-picker-weekday">
            {dayName}
          </div>
        ))}
      </div>
      <div className="app-date-picker-days">
        {days.map((day, idx) => (
          <button
            key={`${viewYear}-${viewMonth}-${idx}`}
            type="button"
            className={`app-date-picker-day ${day && selectedBs && selectedBs.year === viewYear && selectedBs.month === viewMonth && selectedBs.day === day ? 'selected' : ''}`}
            onClick={() => day && handleSelect(day)}
            disabled={!day}
          >
            {day ? toNepaliDigits(day) : ''}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="app-date-picker-wrapper" ref={wrapperRef}>
      <div
        className="app-date-picker-input"
        onClick={() => !disabled && setShowPicker(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            !disabled && setShowPicker(true);
          }
        }}
      >
        <input
          type="text"
          value={selectedAdLabel}
          className={className}
          readOnly
          placeholder={placeholderText}
          disabled={disabled}
          {...rest}
        />
        <div className="app-date-picker-bs-label">
          {selectedBsLabel || 'Select Nepali Date'}
        </div>
      </div>

      {isClearable && selected && !disabled && (
        <button
          type="button"
          className="btn btn-sm btn-link p-0 mt-1"
          onClick={() => onChange(null)}
        >
          Clear
        </button>
      )}

      {showPicker && !disabled && createPortal(picker, document.body)}
    </div>
  );
};

export default AppDatePicker;
