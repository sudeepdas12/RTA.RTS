import React, { useState } from 'react';
import { Card, Form, Button, Row, Col } from 'react-bootstrap';

const DateRangeFilter = ({ title = 'Date Range', onApply }) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleApply = (e) => {
    e.preventDefault();
    if (onApply) {
      onApply({ fromDate, toDate });
    }
  };

  const handleClear = () => {
    setFromDate('');
    setToDate('');
    if (onApply) {
      onApply({ fromDate: '', toDate: '' });
    }
  };

  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <Card.Title className="mb-3">{title}</Card.Title>
        <Form onSubmit={handleApply}>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group controlId="fromDate">
                <Form.Label>From Date</Form.Label>
                <Form.Control
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="toDate">
                <Form.Label>To Date</Form.Label>
                <Form.Control
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
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
