import React from 'react';
import { Alert } from 'react-bootstrap';

export const LoadingState = ({ message = 'Loading...' }) => (
  <div className="loading-container-modern">
    <div className="text-center">
      <div className="loading-spinner-modern mx-auto mb-3"></div>
      <p className="fs-5 text-muted">{message}</p>
    </div>
  </div>
);

export const ErrorState = ({
  message,
  heading = 'Error Loading Data',
  className = 'mt-3',
}) => (
  <Alert variant="danger" className={className}>
    {heading ? <Alert.Heading>{heading}</Alert.Heading> : null}
    <p className="mb-0">{message || 'Something went wrong.'}</p>
  </Alert>
);

export const EmptyState = ({ message = 'No data found.' }) => (
  <p className="text-muted mb-0">{message}</p>
);
