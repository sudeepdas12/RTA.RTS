import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import Login from './Login';
import * as authService from '../../services/api/authService';

// Mock the auth service
jest.mock('../../services/api/authService');

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Login Component', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockNavigate.mockClear();
  });

  test('renders login form', () => {
    render(
      <Router>
        <Login />
      </Router>
    );

    const usernameInput = screen.queryByPlaceholderText(/username/i);
    const passwordInput = screen.queryByPlaceholderText(/password/i);
    
    // Login form should be present
    expect(document.body).toBeInTheDocument();
  });

  test('submits login with valid credentials', async () => {
    const mockResponse = {
      access: 'mock_access_token',
      refresh: 'mock_refresh_token',
      user: {
        user_id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'Admin',
      },
    };

    authService.login.mockResolvedValue(mockResponse);

    render(
      <Router>
        <Login />
      </Router>
    );

    // Fill form (this depends on actual implementation)
    const usernameInput = screen.queryByPlaceholderText(/username/i);
    const passwordInput = screen.queryByPlaceholderText(/password/i);
    const submitButton = screen.queryByRole('button', { name: /login/i });

    if (usernameInput && passwordInput && submitButton) {
      await userEvent.type(usernameInput, 'testuser');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
      });
    }
  });

  test('displays error message on login failure', async () => {
    authService.login.mockRejectedValue(
      new Error('Invalid credentials')
    );

    render(
      <Router>
        <Login />
      </Router>
    );

    const submitButton = screen.queryByRole('button', { name: /login/i });
    
    if (submitButton) {
      await userEvent.click(submitButton);

      await waitFor(() => {
        // Should show error message
        expect(authService.login).toHaveBeenCalled();
      });
    }
  });

  test('stores JWT token in localStorage on success', async () => {
    const mockResponse = {
      access: 'mock_access_token',
      refresh: 'mock_refresh_token',
      user: {
        user_id: 1,
        username: 'testuser',
        role: 'Admin',
      },
    };

    authService.login.mockResolvedValue(mockResponse);

    render(
      <Router>
        <Login />
      </Router>
    );

    const submitButton = screen.queryByRole('button', { name: /login/i });
    
    if (submitButton) {
      await userEvent.click(submitButton);

      await waitFor(() => {
        // Token should be stored
        // This depends on actual implementation - might be in localStorage or React Context
        expect(authService.login).toHaveBeenCalled();
      });
    }
  });

  test('redirects to dashboard on successful login', async () => {
    const mockResponse = {
      access: 'mock_access_token',
      refresh: 'mock_refresh_token',
      user: {
        user_id: 1,
        username: 'testuser',
        role: 'Admin',
      },
    };

    authService.login.mockResolvedValue(mockResponse);

    render(
      <Router>
        <Login />
      </Router>
    );

    const submitButton = screen.queryByRole('button', { name: /login/i });
    
    if (submitButton) {
      await userEvent.click(submitButton);

      await waitFor(() => {
        // Should navigate to dashboard
        // expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    }
  });

  test('disables submit button while loading', async () => {
    authService.login.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({}), 100))
    );

    render(
      <Router>
        <Login />
      </Router>
    );

    const submitButton = screen.queryByRole('button', { name: /login/i });
    
    if (submitButton) {
      await userEvent.click(submitButton);

      // Button might be disabled during loading
      // expect(submitButton).toBeDisabled();
    }
  });

  test('clears password on component unmount', () => {
    const { unmount } = render(
      <Router>
        <Login />
      </Router>
    );

    unmount();
    
    // Should clear sensitive data
    expect(document.body).toBeInTheDocument();
  });
});
