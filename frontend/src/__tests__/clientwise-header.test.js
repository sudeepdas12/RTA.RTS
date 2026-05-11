const fs = require('fs');
const path = require('path');

describe('Client-wise report components', () => {
  const interestPath = path.resolve(__dirname, '..', 'pages', 'interest', 'InterestClientWise.js');
  const dividendPath = path.resolve(__dirname, '..', 'pages', 'dividend', 'DividendClientWise.js');
  let interestCode;
  let dividendCode;

  beforeAll(() => {
    interestCode = fs.readFileSync(interestPath, 'utf8');
    dividendCode = fs.readFileSync(dividendPath, 'utf8');
  });

  test('InterestClientWise includes BOID column header', () => {
    expect(interestCode).toMatch(/<th>BOID<\/th>/);
  });

  test('DividendClientWise includes BOID column header', () => {
    expect(dividendCode).toMatch(/<th>BOID<\/th>/);
  });

  test('Summary report components include BOID header', () => {
    const interestSummaryPath = path.resolve(__dirname, '..', 'pages', 'interest', 'InterestSummaryReports.js');
    const dividendSummaryPath = path.resolve(__dirname, '..', 'pages', 'dividend', 'DividendSummaryReports.js');
    const interestSummaryCode = fs.readFileSync(interestSummaryPath, 'utf8');
    const dividendSummaryCode = fs.readFileSync(dividendSummaryPath, 'utf8');
    expect(interestSummaryCode).toMatch(/<th>BOID<\/th>/);
    expect(dividendSummaryCode).toMatch(/<th>BOID<\/th>/);
  });

  test('Interest summary report contains sector table header', () => {
    const interestSummaryPath = path.resolve(__dirname, '..', 'pages', 'interest', 'InterestSummaryReports.js');
    const interestSummaryCode = fs.readFileSync(interestSummaryPath, 'utf8');
    expect(interestSummaryCode).toMatch(/<th>Sector<\/th>/);
  });

  test('Client page uses company field for selection and payload', () => {
    const clientsPath = path.resolve(__dirname, '..', 'pages', 'Clients.js');
    const clientsCode = fs.readFileSync(clientsPath, 'utf8');
    // ensure value prop uses `currentClient.company` and payload handles company
    expect(clientsCode).toMatch(/value=\{currentClient\.company\}/);
    expect(clientsCode).toMatch(/payload = \{ \.{3}currentClient \}/);
  });
});
