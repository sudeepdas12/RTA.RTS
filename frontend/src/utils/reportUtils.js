export const buildDateParams = (range) => {
  const params = {};
  if (range?.fromDate) params.from_date = range.fromDate;
  if (range?.toDate) params.to_date = range.toDate;
  return params;
};

export const formatCurrency = (value) => {
  const formatted = new Intl.NumberFormat('ne-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
  return `रू ${formatted}`;
};

export const aggregateBy = (items, keyFn, valueFn) => {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item) || 'Unknown';
    const value = Number(valueFn(item) || 0);
    map.set(key, (map.get(key) || 0) + value);
  });
  return Array.from(map.entries()).map(([key, total]) => ({ key, total }));
};

export const filterByCompanyIds = (items, companyIds) => {
  if (!companyIds?.length) return [];
  const idSet = new Set(companyIds);
  return items.filter((item) => idSet.has(item.company));
};

export const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
};
