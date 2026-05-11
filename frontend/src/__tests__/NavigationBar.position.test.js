import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NavigationBar from '../components/NavigationBar';
import { AuthProvider } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

// Mock API calls that tests shouldn't perform
jest.mock('../services/api', () => ({
  pendingService: { getAll: jest.fn(() => Promise.resolve({ data: { results: [], count: 0 } })) }
}));

// Provide a small wrapper to set user and permission context
const renderWithAuth = (ui, { user = { full_name: 'Test Admin', username: 'testadmin', role: 'Admin', permissions: { users: ['approve'] } } } = {}) => {
  // write user and token into localStorage to satisfy AuthProvider's init
  localStorage.setItem('user', JSON.stringify(user));
  const payload = { exp: Math.floor(Date.now() / 1000) + 3600 };
  const fakeToken = 'h.' + window.btoa(JSON.stringify(payload)) + '.s';
  localStorage.setItem('access_token', fakeToken);
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
};

test('user dropdown opens and is positioned with caret', async () => {
  renderWithAuth(<NavigationBar />);

  // Click user button
  const userBtn = await screen.findByText(/Test Admin/i);
  fireEvent.click(userBtn);

  // Wait for menu to show
  await waitFor(() => {
    const menu = document.querySelector('.user-menu');
    expect(menu).toBeInTheDocument();
    // In jsdom we cannot assert exact layout numbers reliably; ensure the
    // menu is shown and caret exists. Browser layout will be validated
    // visually / in E2E when re-enabled.
    expect(menu.classList.contains('show')).toBeTruthy();

    const caret = menu.querySelector('.dropdown-caret');
    expect(caret).toBeInTheDocument();
  });
});
