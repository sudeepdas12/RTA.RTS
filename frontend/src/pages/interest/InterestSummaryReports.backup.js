import React, { useState } from 'react';
import { Container, Card, Button, Spinner, Alert } from 'react-bootstrap';
import NavigationBar from '../../components/NavigationBar';
import DateRangeFilter from '../../components/DateRangeFilter';
import { reportService } from '../../services/api';
import { buildDateParams } from '../../utils/reportUtils';

const InterestSummaryReports = () => {
  const [range, setRange] = useState({ fromDate: '', toDate: '' });
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const params = buildDateParams(range);
      const response = await reportService.exportInterest(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `interest-report-${timestamp}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const rangeText = range.fromDate && range.toDate
    ? `From ${range.fromDate} to ${range.toDate}`
    : 'All dates';

  return (
    <>
      <NavigationBar />
      <Container fluid className="mt-4">
        <h2 className="mb-3">Debenture Interest Payable - Summary Reports</h2>
        <DateRangeFilter onApply={setRange} />
        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
        <Card className="shadow-sm mt-3">
          <Card.Body>
            <p className="text-muted mb-3">{rangeText}</p>
            <div className="d-flex gap-2">
              <Button
                variant="primary"
                onClick={handleExport}
                disabled={exporting}
                className="d-flex align-items-center gap-2"
              >
                {exporting && <Spinner animation="border" size="sm" />}
                {exporting ? 'Exporting...' : 'Export Report'}
              </Button>
              <p className="text-muted mb-0 ms-2 align-self-center">
                Download detailed interest payable summary as Excel file
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
};

export default InterestSummaryReports;
