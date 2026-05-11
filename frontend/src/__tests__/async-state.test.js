import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/AsyncState';

describe('AsyncState shared components', () => {
  test('renders loading message', () => {
    render(<LoadingState message="Loading modern data..." />);
    expect(screen.getByText('Loading modern data...')).toBeInTheDocument();
  });

  test('renders error with heading', () => {
    render(<ErrorState heading="Failed" message="Unable to fetch" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Unable to fetch')).toBeInTheDocument();
  });

  test('renders empty message', () => {
    render(<EmptyState message="No records" />);
    expect(screen.getByText('No records')).toBeInTheDocument();
  });
});
