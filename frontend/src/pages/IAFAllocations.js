import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const IAFAllocations = () => {
  useAuth();
  const authToken = localStorage.getItem('access_token');
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('PUBLIC');
  const [companyCode, setCompanyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [allocations, setAllocations] = useState([]);
  const [summary, setSummary] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    fetchAllocations();
    fetchSummary();
  }, []);

  const fetchAllocations = async () => {
    try {
      const response = await fetch('/api/allocations/allocations/?page_size=100', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAllocations(data.results || data);
      }
    } catch (err) {
      console.error('Error fetching allocations:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/allocations/allocations/summary/', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const fileName = selectedFile?.name?.toLowerCase() || '';
    if (selectedFile && !fileName.endsWith('.iaf') && !fileName.endsWith('.xlsx')) {
      setError('Please select a valid .iaf or .xlsx file');
      setFile(null);
    } else {
      setError('');
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (companyCode) {
      formData.append('company_code', companyCode);
    }

    try {
      const response = await fetch('/api/allocations/allocations/upload/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`✓ Successfully uploaded ${data.total_records} allocations from ${data.file_name}`);
        setUploadResult(data);
        setFile(null);
        setCategory('PUBLIC');
        setCompanyCode('');
        setTimeout(() => {
          fetchAllocations();
          fetchSummary();
        }, 1000);
      } else {
        setError(`Upload failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Error uploading file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/allocations/allocations/export-template/', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!response.ok) {
        throw new Error('Template download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'iaf_allocation_template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Failed to download template: ${err.message}`);
    }
  };

  const getCategoryBadge = (category) => {
    const variants = {
      'LOCAL': 'primary',
      'FOREIGN': 'info',
      'PUBLIC': 'success',
      'EMPLOYEE': 'warning'
    };
    return <Badge bg={variants[category] || 'secondary'}>{category}</Badge>;
  };

  return (
    <div className="mt-2">
      {/* Summary Cards */}
      <Row className="mb-4">
        {summary && summary.map((item, idx) => (
          <Col md={3} key={idx} className="mb-3">
            <Card>
              <Card.Body className="text-center">
                <h6 className="text-muted">{item.category}</h6>
                <h3>{item.total_records || 0}</h3>
                <small className="text-muted">Records</small>
                <p className="mt-2 mb-0">
                  <strong>{(item.total_kitta || 0).toLocaleString()}</strong> kitta
                </p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Upload Section */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header className="bg-primary text-white">
              <Card.Title className="mb-0">Upload IAF File</Card.Title>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleUpload}>
                <Form.Group className="mb-3">
                  <Form.Label>Category *</Form.Label>
                  <Form.Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={loading}
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="LOCAL">Local</option>
                    <option value="FOREIGN">Foreign</option>
                    <option value="EMPLOYEE">Employee</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Company Code (Optional)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., RBBF4008283"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Select .iaf or .xlsx File *</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".iaf,.xlsx"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                  {file && <small className="text-success">✓ {file.name}</small>}
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  disabled={loading || !file}
                  className="w-100"
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Uploading...
                    </>
                  ) : (
                    'Upload File'
                  )}
                </Button>

                <Button
                  variant="outline-secondary"
                  type="button"
                  className="w-100 mt-2"
                  onClick={handleDownloadTemplate}
                  disabled={loading}
                >
                  <i className="fas fa-download me-2"></i>
                  Download Excel Template
                </Button>
              </Form>

              {uploadResult && (
                <Alert variant="info" className="mt-3 mb-0">
                  <strong>Last Upload:</strong><br />
                  Files: {uploadResult.file_name}<br />
                  Category: {uploadResult.category}<br />
                  Total Kitta: {uploadResult.total_kitta?.toLocaleString() || 0}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="bg-light">
            <Card.Header>
              <Card.Title className="mb-0 text-dark">File Format Info</Card.Title>
            </Card.Header>
            <Card.Body>
              <h6>Expected .iaf Format:</h6>
              <pre className="small bg-white p-3 rounded" style={{ overflow: 'auto' }}>
{`Header: BBBBBBBBBBTTTTTTTTTTT...
BOID[16] | Kitta[12] | Amounts | Locking[8] | Symbol

Example:
1301150000048068 000000000100 ... 00000000 RBBF4008283

Where:
• BOID = 16 chars (applicant ID)
• Kitta = 12 chars (allocated kitta)
• Locking = 8 chars (locking period in days)
• Symbol = Company symbol/code`}
              </pre>
              <p className="small text-muted mb-2">
                Excel uploads are also supported when the first sheet includes columns for boid, kitta_allocated, decimal_kitta, company_code, status_type, locking_date, and company_symbol.
              </p>
              <hr />
              <p className="mb-2"><strong>Sample Files:</strong></p>
              <ul className="small mb-0">
                <li>public_allocation.iaf (125,000 kitta)</li>
                <li>local_allocation.iaf (50,000 kitta)</li>
                <li>foreign_allocation.iaf (35,000 kitta)</li>
                <li>employee_allocation.iaf (15,000 kitta)</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Allocations Table */}
      <Card>
        <Card.Header className="bg-secondary text-white">
          <Card.Title className="mb-0">Recent Allocations ({allocations.length})</Card.Title>
        </Card.Header>
        <Card.Body>
          {allocations.length > 0 ? (
            <div className="table-responsive">
              <Table striped hover size="sm">
                <thead>
                  <tr>
                    <th>BOID</th>
                    <th>Category</th>
                    <th>Kitta</th>
                    <th>Company Code</th>
                    <th>Status</th>
                    <th>Locking Date</th>
                    <th>Symbol</th>
                    <th>Upload Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.slice(0, 50).map((alloc) => (
                    <tr key={alloc.id}>
                      <td className="font-monospace small">{alloc.boid}</td>
                      <td>{getCategoryBadge(alloc.category)}</td>
                      <td>{alloc.kitta_allocated?.toLocaleString() || 0}</td>
                      <td className="font-monospace">{alloc.company_code}</td>
                      <td className="small">{alloc.status_type}</td>
                      <td className="small">{alloc.locking_date ? new Date(alloc.locking_date).toLocaleDateString() : '-'}</td>
                      <td>{alloc.company_symbol}</td>
                      <td className="small">{new Date(alloc.upload_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <p className="text-muted text-center py-4">No allocations uploaded yet</p>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default IAFAllocations;
