/**
 * Bikram Sambat (Nepali) Calendar Conversion Utility
 * Converts Gregorian date to Bikram Sambat date
 */

const BS_CALENDAR_DATA = {
  // [daysInMonth for each month (12 months + optional 13th)]
  // Total days in the year, start day offset (0=Sunday)
  years: {
    2075: { days: [31,31,32,32,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 1 },
    2076: { days: [31,31,32,32,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 2 },
    2077: { days: [31,31,32,32,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 3 },
    2078: { days: [31,31,32,31,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 4 },
    2079: { days: [31,31,32,31,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 5 },
    2080: { days: [31,31,32,32,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 7 },
    2081: { days: [31,31,32,32,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 1 },
    2082: { days: [31,31,32,32,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 2 },
    2083: { days: [31,31,32,31,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 3 },
    2084: { days: [31,31,32,32,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 5 },
    2085: { days: [31,31,32,32,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 6 },
    2086: { days: [31,31,32,31,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 0 },
    2087: { days: [31,31,32,32,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 1 },
    2088: { days: [31,31,32,31,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 2 },
    2089: { days: [31,31,32,31,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 3 },
    2090: { days: [31,31,32,32,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 5 },
    2091: { days: [31,32,32,31,31,30,30,29,30,29,30,30], totalDays: 366, startOffset: 0 },
    2092: { days: [31,31,32,32,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 1 },
    2093: { days: [31,31,32,31,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 2 },
  },
};

const BS_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const BS_MONTHS_NP = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन',
  'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'
];

const BS_DAYS_NP = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];

/**
 * Convert AD date to BS date
 * Uses a lookup table approach for accuracy
 */
export function adToBs(adDate) {
  // Reference: BS 2080-01-01 = AD 2023-04-14 (Baisakh 1, 2080)
  const referenceBS = { year: 2080, month: 1, day: 1 };
  const referenceAD = new Date(2023, 3, 14); // April 14, 2023

  // Calculate days difference
  const diffTime = adDate.getTime() - referenceAD.getTime();
  let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let bsYear = referenceBS.year;
  let bsMonth = referenceBS.month;
  let bsDay = referenceBS.day;

  if (diffDays >= 0) {
    // Forward conversion
    while (diffDays > 0) {
      const yearData = getYearData(bsYear);
      const daysInMonth = yearData.days[bsMonth - 1];
      const remainingDaysInMonth = daysInMonth - bsDay;

      if (diffDays <= remainingDaysInMonth) {
        bsDay += diffDays;
        diffDays = 0;
      } else {
        diffDays -= (remainingDaysInMonth + 1);
        bsMonth++;
        bsDay = 1;
        if (bsMonth > 12) {
          bsMonth = 1;
          bsYear++;
        }
      }
    }
  } else {
    // Backward conversion
    diffDays = Math.abs(diffDays);
    while (diffDays > 0) {
      if (diffDays < bsDay) {
        bsDay -= diffDays;
        diffDays = 0;
      } else {
        diffDays -= bsDay;
        bsMonth--;
        if (bsMonth < 1) {
          bsYear--;
          bsMonth = 12;
        }
        bsDay = getYearData(bsYear).days[bsMonth - 1];
      }
    }
  }

  return { year: bsYear, month: bsMonth, day: bsDay };
}

function getYearData(year) {
  if (BS_CALENDAR_DATA.years[year]) {
    return BS_CALENDAR_DATA.years[year];
  }
  // Fallback for years not in data
  return { days: [31,31,32,32,31,30,30,29,30,29,30,30], totalDays: 365, startOffset: 0 };
}

export function getBsMonthDays(year, month) {
  // Prefer lookup table for month lengths (stable and fast)
  const yearData = getYearData(year);
  if (yearData && yearData.days && yearData.days[month - 1]) {
    return yearData.days[month - 1];
  }

  // Fallback: compute month length via AD conversion if lookup not available
  try {
    const startAd = bsToAd({ year, month, day: 1 });
    const nextBs = month === 12 ? { year: year + 1, month: 1, day: 1 } : { year, month: month + 1, day: 1 };
    const endAd = bsToAd(nextBs);
    const diffDays = Math.round((endAd.getTime() - startAd.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays < 60) {
      return diffDays;
    }
  } catch (e) {
    // If conversion fails, fallback to 30 as a safe default
  }

  return 30;
}

/**
 * Format BS date as string
 */
export function formatBsDate(bsDate, format = 'np') {
  if (format === 'np') {
    return `${bsDate.day} ${BS_MONTHS_NP[bsDate.month - 1]} ${bsDate.year}`;
  }
  return `${bsDate.day} ${BS_MONTHS_EN[bsDate.month - 1]} ${bsDate.year}`;
}

export function isSameBsDate(a, b) {
  return a?.year === b?.year && a?.month === b?.month && a?.day === b?.day;
}

export function isBsBefore(a, b) {
  if (a.year !== b.year) return a.year < b.year;
  if (a.month !== b.month) return a.month < b.month;
  return a.day < b.day;
}

export function bsToAd(bsDate) {
  const referenceBS = { year: 2080, month: 1, day: 1 };
  const referenceAD = new Date(2023, 3, 14);
  const currentBS = { ...referenceBS };
  const currentAD = new Date(referenceAD);

  if (isSameBsDate(currentBS, bsDate)) {
    return currentAD;
  }

  if (isBsBefore(currentBS, bsDate)) {
    while (!isSameBsDate(currentBS, bsDate)) {
      currentAD.setDate(currentAD.getDate() + 1);
      const yearData = getYearData(currentBS.year);
      currentBS.day += 1;
      if (currentBS.day > yearData.days[currentBS.month - 1]) {
        currentBS.day = 1;
        currentBS.month += 1;
        if (currentBS.month > 12) {
          currentBS.month = 1;
          currentBS.year += 1;
        }
      }
    }
  } else {
    while (!isSameBsDate(currentBS, bsDate)) {
      currentAD.setDate(currentAD.getDate() - 1);
      currentBS.day -= 1;
      if (currentBS.day < 1) {
        currentBS.month -= 1;
        if (currentBS.month < 1) {
          currentBS.year -= 1;
          currentBS.month = 12;
        }
        currentBS.day = getYearData(currentBS.year).days[currentBS.month - 1];
      }
    }
  }

  return currentAD;
}

/**
 * Get Nepali day name
 */
export function getBsDayName(dayOfWeek) {
  return BS_DAYS_NP[dayOfWeek];
}

/**
 * Convert English digits to Nepali (Devanagari) digits
 * e.g. "2083" → "२०८३", "3" → "३"
 */
export function toNepaliDigits(input) {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return String(input).replace(/[0-9]/g, (d) => nepaliDigits[parseInt(d)]);
}

/**
 * Format BS date as string with Nepali digits
 */
export function formatBsDateNp(bsDate) {
  return `${toNepaliDigits(bsDate.day)} ${BS_MONTHS_NP[bsDate.month - 1]} ${toNepaliDigits(bsDate.year)}`;
}

export { BS_MONTHS_NP, BS_DAYS_NP };

export default {
  adToBs,
  formatBsDate,
  formatBsDateNp,
  getBsDayName,
  toNepaliDigits,
  BS_MONTHS_NP,
  bsToAd,
  isSameBsDate,
  isBsBefore,
  getBsMonthDays,
};
