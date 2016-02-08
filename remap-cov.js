var remapIstanbul = require('remap-istanbul');

remapIstanbul('coverage/coverage.json', {
    'lcovonly': 'coverage/lcov.info',
    'json': 'coverage/coverage.json',
    'html': 'coverage/lcov-report'
});
