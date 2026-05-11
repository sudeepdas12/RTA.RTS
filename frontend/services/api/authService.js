// Compatibility shim for '../../services/api/authService' imports in tests
// Export the `authService` object directly so tests importing the module
// as `import * as authService from '.../authService'` get an object with `login`.
// Compatibility shim for '../../services/api/authService' imports in tests
// Export the `authService` object directly so tests importing the module
// as `import * as authService from '.../authService'` get an object with `login`.
module.exports = require('../../src/services/api/authService').authService;
