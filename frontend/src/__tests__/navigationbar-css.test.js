const fs = require('fs');
const path = require('path');

describe('NavigationBar.css content checks', () => {
  const cssPath = path.resolve(__dirname, '..', 'components', 'NavigationBar.css');
  let cssText;

  beforeAll(() => {
    cssText = fs.readFileSync(cssPath, 'utf8');
  });

  test('defines theme CSS variables in :root', () => {
    expect(cssText).toMatch(/:root\s*\{[^}]*--nav-grad-start/);
    expect(cssText).toMatch(/--nav-grad-mid/);
    expect(cssText).toMatch(/--nav-grad-end/);
  });

  test('modern-navbar uses variables and has no conflicting position declarations', () => {
    const m = cssText.match(/\.modern-navbar\s*\{([\s\S]*?)\}/);
    expect(m).toBeTruthy();
    const block = m[1];
    expect(block).toMatch(/--nav-grad-start/);
    // Should contain position: sticky and NOT position: relative later
    expect(block).toMatch(/position:\s*sticky/);
    expect(block).not.toMatch(/position:\s*relative/);
  });

  test('navbar-menu-fullwidth does not contain redundant overflow property', () => {
    const m = cssText.match(/\.navbar-menu-fullwidth\s*\{([\s\S]*?)\}/);
    expect(m).toBeTruthy();
    const block = m[1];
    // ensures we don't have a general 'overflow: visible !important' which conflicts with overflow-x/overflow-y
    expect(block).not.toMatch(/overflow:\s*visible\s*!important/);
    expect(block).toMatch(/overflow-x:\s*auto/);
    expect(block).toMatch(/overflow-y:\s*visible\s*!important/);
  });
});
