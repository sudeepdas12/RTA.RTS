import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavigationBar from '../components/NavigationBar';

// Mock the AuthContext to avoid provider complexities
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'test', full_name: 'Test User', role: 'Admin', permissions: { interest_payables: ['read'] } },
    logout: jest.fn(),
    hasPermission: () => true
  })
}));

const cssText = require('fs').readFileSync(require('path').resolve(__dirname, '..', 'components', 'NavigationBar.css'), 'utf8');

describe('NavigationBar layout & brand position', () => {
  test('navbar-brand is the first child in .navbar-top and should be left-aligned', () => {
    const { container } = render(
      <MemoryRouter>
        <NavigationBar />
      </MemoryRouter>
    );

    const top = container.querySelector('.navbar-top');
    expect(top).toBeTruthy();
    expect(top.firstElementChild).toHaveClass('navbar-brand');

    // Ensure the controls wrapper exists and is the last child
    const controls = top.querySelector('.navbar-controls');
    expect(controls).toBeTruthy();
    expect(top.lastElementChild).toBe(controls);
  });

  test('CSS includes margin-right: auto for .navbar-brand to keep it left-aligned', () => {
    expect(cssText).toMatch(/\.navbar-brand[^{]*\{[^}]*margin-right:\s*auto/);
  });
});
