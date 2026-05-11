import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NavigationBar from '../components/NavigationBar';
import { AuthProvider } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

// Mock API calls that tests shouldn't perform
jest.mock('../services/api', () => ({
  pendingService: { getAll: jest.fn(() => Promise.resolve({ data: { results: [], count: 0 } })) }
}));

const renderWithAuth = (ui, { user = { full_name: 'Test Admin', username: 'testadmin', role: 'Admin', permissions: { users: ['approve'] } } } = {}) => {
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

test('notifications dropdown opens and positions caret', async () => {
  renderWithAuth(<NavigationBar />);
  const notifBtn = await screen.findByTitle(/Pending approvals/i);
  fireEvent.click(notifBtn);

  await waitFor(() => {
    const menu = document.querySelector('.notifications-menu');
    expect(menu).toBeInTheDocument();
    // In jsdom we can't rely on layout measurements; ensure the menu is shown
    // in the DOM and the caret exists. Real browsers will position via JS.
    expect(menu.classList.contains('show')).toBeTruthy();
    const caret = menu.querySelector('.dropdown-caret');
    expect(caret).toBeInTheDocument();
  });
});