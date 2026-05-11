import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col } from 'react-bootstrap';
import AppDatePicker from './AppDatePicker';
import { parseISO, format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

// Props:
// - title
// - onApply({ fromDate, toDate }) — dates as 'YYYY-MM-DD' strings
// - compact (bool) -> renders inline compact controls
// - initialFrom, initialTo -> optional initial values (YYYY-MM-DD)
const DateRangeFilter = ({ title = 'Date Range', onApply, compact = false, initialFrom = '', initialTo = '' }) => {
  const parseToDate = (s) => (s ? parseISO(s) : null);
  const [fromDate, setFromDate] = useState(initialFrom ? parseToDate(initialFrom) : null);
  const [toDate, setToDate] = useState(initialTo ? parseToDate(initialTo) : null);

  useEffect(() => {
    // update internal state if initial props change
    setFromDate(initialFrom ? parseToDate(initialFrom) : null);
    setToDate(initialTo ? parseToDate(initialTo) : null);
  }, [initialFrom, initialTo]);

  const fmt = (d) => (d ? format(d, 'yyyy-MM-dd') : '');

  const handleApply = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (onApply) onApply({ fromDate: fmt(fromDate), toDate: fmt(toDate) });
  };

  const handleClear = () => {
    setFromDate(null);
    setToDate(null);
    if (onApply) onApply({ fromDate: '', toDate: '' });
  };

  if (compact) {
    return (
      <div className="audit-date-compact d-flex align-items-center gap-2">
        <AppDatePicker
          selected={fromDate}
          onChange={(d) => setFromDate(d)}
          placeholderText="From"
          className="form-control-compact"
          dateFormat="yyyy-MM-dd"
          isClearable
        />
        <AppDatePicker
          selected={toDate}
          onChange={(d) => setToDate(d)}
          placeholderText="To"
          className="form-control-compact"
          dateFormat="yyyy-MM-dd"
          isClearable
        />
        <Button variant="primary" size="sm" onClick={handleApply}>Apply</Button>
        <Button variant="outline-secondary" size="sm" onClick={handleClear}>Clear</Button>
      </div>
    );
  }

  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <Card.Title className="mb-3">{title}</Card.Title>
        <Form onSubmit={handleApply}>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group controlId="fromDate">
                <Form.Label>From Date</Form.Label>
                <AppDatePicker
                  selected={fromDate}
                  onChange={(d) => setFromDate(d)}
                  placeholderText="From Date"
                  className="form-control"
                  dateFormat="yyyy-MM-dd"
                  isClearable
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="toDate">
                <Form.Label>To Date</Form.Label>
                <AppDatePicker
                  selected={toDate}
                  onChange={(d) => setToDate(d)}
                  placeholderText="To Date"
                  className="form-control"
                  dateFormat="yyyy-MM-dd"
                  isClearable
                />
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex gap-2">
              <Button type="submit" variant="primary">
                Apply
              </Button>
              <Button type="button" variant="outline-secondary" onClick={handleClear}>
                Clear
              </Button>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default DateRangeFilter;
