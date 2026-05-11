import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from 'react-datepicker';
import NepaliDate from 'nepali-date-converter';
import NepaliDatePicker, { toAD, toBS } from '@zener/nepali-datepicker-react';
import '@zener/nepali-datepicker-react/index.css';

const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

const CalendarPortal = ({ children }) => {
  if (typeof document === 'undefined') {
    return children;
  }
  return createPortal(children, document.body);
};

const formatBsDate = (adDate) => {
  if (!adDate) return '';
  try {
    return NepaliDate.fromAD(adDate).format('YYYY-MM-DD');
  } catch (error) {
    return '';
  }
};

const toNepaliDigits = (value) =>
  String(value)
    .split('')
    .map((char) => (/[0-9]/.test(char) ? NEPALI_DIGITS[Number(char)] : char))
    .join('');

const toAdIsoDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toBsString = (date) => {
  const adIso = toAdIsoDate(date);
  if (!adIso) return '';
  try {
    return toBS(adIso).toString();
  } catch (error) {
    return '';
  }
};

const toAdDateFromBs = (bsDateLike) => {
  if (!bsDateLike) return null;
  const bsString = typeof bsDateLike === 'string' ? bsDateLike : bsDateLike.toString?.();
  if (!bsString) return null;

  try {
    const ad = toAD(bsString);
    return new Date(ad.year, ad.month, ad.date, 12, 0, 0, 0);
  } catch (error) {
    return null;
  }
};

const mergeClassNames = (...classNames) => classNames.filter(Boolean).join(' ');

const AppDatePicker = ({
  selected,
  popperClassName = '',
  popperProps = {},
  popperPlacement = 'bottom-start',
  calendarClassName = '',
  containerClassName = '',
  showNepaliDate = true,
  ...props
}) => {
  const [calendarLanguage, setCalendarLanguage] = useState('en');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('calendar_language');
    if (stored === 'np' || stored === 'en') {
      setCalendarLanguage(stored);
    }
  }, []);

  const handleLanguageChange = (language) => {
    setCalendarLanguage(language);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('calendar_language', language);
    }
  };

  const bsDate = formatBsDate(selected);
  const bsPickerValue = toBsString(selected);

  const nepaliPickerClassNames = {
    default: 'form-control app-nepali-picker-input',
    focus: 'app-nepali-picker-input--focus',
    disabled: 'form-control app-nepali-picker-input app-nepali-picker-input--disabled',
  };

  const resolveNepaliPickerClassNames = () => {
    const externalClassName = props.className;

    if (typeof externalClassName === 'function') {
      const externalClasses = externalClassName() || {};
      return {
        default: mergeClassNames(nepaliPickerClassNames.default, externalClasses.default),
        focus: mergeClassNames(nepaliPickerClassNames.focus, externalClasses.focus),
        disabled: mergeClassNames(nepaliPickerClassNames.disabled, externalClasses.disabled),
      };
    }

    if (externalClassName && typeof externalClassName === 'object') {
      return {
        default: mergeClassNames(nepaliPickerClassNames.default, externalClassName.default),
        focus: mergeClassNames(nepaliPickerClassNames.focus, externalClassName.focus),
        disabled: mergeClassNames(nepaliPickerClassNames.disabled, externalClassName.disabled),
      };
    }

    return {
      default: mergeClassNames(nepaliPickerClassNames.default, externalClassName),
      focus: nepaliPickerClassNames.focus,
      disabled: mergeClassNames(nepaliPickerClassNames.disabled, externalClassName),
    };
  };

  const handleNepaliPickerChange = (nextBsDate) => {
    if (!props.onChange) return;
    if (!nextBsDate) {
      props.onChange(null);
      return;
    }

    props.onChange(toAdDateFromBs(nextBsDate));
  };

  return (
    <div className={`app-date-picker ${containerClassName}`.trim()}>
      <div className="app-date-picker-lang-toggle" role="group" aria-label="Calendar language selector">
        <button
          type="button"
          className={`app-date-picker-lang-btn ${calendarLanguage === 'en' ? 'active' : ''}`}
          onClick={() => handleLanguageChange('en')}
          aria-pressed={calendarLanguage === 'en'}
          title="English Calendar"
        >
          EN
        </button>
        <button
          type="button"
          className={`app-date-picker-lang-btn ${calendarLanguage === 'np' ? 'active' : ''}`}
          onClick={() => handleLanguageChange('np')}
          aria-pressed={calendarLanguage === 'np'}
          title="नेपाली Calendar"
        >
          ने
        </button>
      </div>
      {calendarLanguage === 'np' ? (
        <NepaliDatePicker
          type="BS"
          lang="np"
          value={bsPickerValue || null}
          onChange={handleNepaliPickerChange}
          className={resolveNepaliPickerClassNames}
          placeholder={props.placeholderText || props.placeholder || 'मिति चयन गर्नुहोस्'}
          disabled={props.disabled}
          showclear={props.isClearable !== false}
          portalClassName="zener-font-sans zener-mt-1 react-datepicker-global-popper app-nepali-picker-portal"
          menuContainerClassName="zener-bg-menu-container-bg zener-rounded-md zener-shadow-menu zener-text-menu-container-text app-nepali-picker-menu"
          calendarClassName="zener-p-2 app-nepali-picker-calendar"
        />
      ) : (
        <DatePicker
          {...props}
          selected={selected}
          popperContainer={CalendarPortal}
          popperPlacement={popperPlacement}
          popperClassName={`react-datepicker-global-popper ${popperClassName}`.trim()}
          popperProps={{ strategy: 'fixed', ...popperProps }}
          calendarClassName={`react-datepicker-premium ${calendarClassName}`.trim()}
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          scrollableYearDropdown
          yearDropdownItemNumber={20}
        />
      )}
      {showNepaliDate && bsDate && (
        <div className="app-date-picker-bs-label">
          {calendarLanguage === 'np' ? `वि.सं: ${toNepaliDigits(bsDate)}` : `BS: ${bsDate}`}
        </div>
      )}
    </div>
  );
};

export default AppDatePicker;
