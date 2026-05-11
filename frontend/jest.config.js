{
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": [
    "<rootDir>/src/setupTests.js"
  ],
  "moduleNameMapper": {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/fileMock.js",
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  "testMatch": [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx}",
    "<rootDir>/src/**/*.{spec,test}.{js,jsx}"
  ],
  "collectCoverageFrom": [
    "src/**/*.{js,jsx}",
    "!src/index.js",
    "!src/reportWebVitals.js",
    "!src/setupTests.js",
    "!src/**/*.test.{js,jsx}",
    "!src/**/__tests__/**"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 60,
      "functions": 60,
      "lines": 60,
      "statements": 60
    }
  },
  "transform": {
    "^.+\\.(js|jsx)$": "babel-jest"
  },
  "transformIgnorePatterns": [
    "node_modules/(?!(chart.js|react-chartjs-2)/)"
  ]
}
