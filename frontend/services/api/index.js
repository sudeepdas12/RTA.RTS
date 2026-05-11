// Compatibility shim so tests using '../../services/api' resolve correctly
// Provide the same shape tests expect (e.g., `reports`) by mapping
// to the actual implementations exported under src/services/api.js
const realApi = require('../../src/services/api');

if (process && process.env && process.env.NODE_ENV === 'test') {
	module.exports = {
		// expose a reports object with a mockable `getDashboard` for tests
		reports: (typeof jest !== 'undefined' && jest.fn) ? { getDashboard: jest.fn() } : { getDashboard: () => Promise.resolve({}) },
		// keep a pendingService mock shape used by other tests
		pendingService: (typeof jest !== 'undefined' && jest.fn) ? { getAll: jest.fn().mockResolvedValue({ data: { results: [], count: 0 } }) } : { getAll: () => Promise.resolve({ data: { results: [], count: 0 } }) },
	};
}

module.exports = {
	...realApi,
	reports: realApi.reportService || realApi.reports || {},
};
