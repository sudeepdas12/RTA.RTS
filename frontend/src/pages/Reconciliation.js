import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Tab, Tabs, Alert } from 'react-bootstrap';
import { FaUpload, FaCheckCircle, FaTimesCircle, FaSyncAlt, FaUniversity, FaFileAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import NavigationBar from '../components/NavigationBar';
import api from '../services/api';
import '../styles/dashboard.css';

const Reconciliation = () => {
  const [statements, setStatements] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('statements');

  useEffect(() => {
    fetchStatements();
    fetchTransactions();
  }, []);

  const fetchStatements = async () => {
    try {
      const response = await api.get('/reconciliation/bank-statements/');
      setStatements(Array.isArray(response.data) ? response.data : response.data.results || []);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch bank statements:', error);
      setError(`Error loading statements: ${error.message}`);
      toast.error('Failed to fetch bank statements');
      setStatements([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/reconciliation/bank-transactions/');
      setTransactions(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setTransactions([]);
    }
  };

  const handleStatementUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/reconciliation/bank-statements/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Bank statement uploaded successfully');
      fetchStatements();
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to upload bank statement');
    }
  };

  const handleAutoMatch = async () => {
    try {
      await api.post('/reconciliation/auto_match/');
      toast.success('Auto-matching completed');
      fetchTransactions();
    } catch (error) {
      toast.error('Auto-matching failed');
    }
  };

  if (loading) {
    return (
      <>
        <NavigationBar />
        <div className="loading-container-modern">
          <div className="text-center">
            <div className="loading-spinner-modern mx-auto mb-3"></div>
            <p className="fs-5 text-muted">Loading reconciliation data...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavigationBar />
        <div className="dashboard-container">
          <Container fluid>
            <Alert variant="danger" className="mt-4">
              <Alert.Heading>Error Loading Data</Alert.Heading>
              <p className="mb-0">{error}</p>
            </Alert>
          </Container>
        </div>
      </>
    );
  }

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <Row className="mb-4">
            <Col>
              <h2 className="dashboard-header"><FaUniversity style={{ marginRight: '0.5rem' }} /> Bank Reconciliation</h2>
            </Col>
            <Col className="text-end d-flex justify-content-end align-items-center gap-2">
              <Button variant="primary" className="me-2" onClick={() => document.getElementById('statementUpload').click()}>
                <FaUpload /> Upload Statement
              </Button>
              <input id="statementUpload" type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={handleStatementUpload} />
              <Button variant="success" onClick={handleAutoMatch}>
                <FaSyncAlt /> Auto Match
              </Button>
            </Col>
          </Row>

          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
            <Tab eventKey="statements" title="Bank Statements">
              <Card className="chart-card-modern">
                <Card.Header><FaFileAlt style={{ marginRight: '0.5rem' }} /> Bank Statements</Card.Header>
                <Card.Body>
                  <div className="table-responsive">
                    <Table className="table-modern mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Bank Name</th>
                      <th>Account No</th>
                      <th>Period From</th>
                      <th>Period To</th>
                      <th>Opening Balance</th>
                      <th>Closing Balance</th>
                      <th>Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statements.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center">No bank statements found</td>
                      </tr>
                    ) : (
                      statements.map(stmt => (
                        <tr key={stmt.bank_stmt_id}>
                          <td>{stmt.bank_stmt_id}</td>
                          <td><strong>{stmt.bank_name}</strong></td>
                          <td>{stmt.account_no}</td>
                          <td>{new Date(stmt.statement_from).toLocaleDateString()}</td>
                          <td>{new Date(stmt.statement_to).toLocaleDateString()}</td>
                          <td>{stmt.opening_balance?.toLocaleString()}</td>
                          <td>{stmt.closing_balance?.toLocaleString()}</td>
                          <td>{new Date(stmt.uploaded_at).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
                  </div>
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="transactions" title="Transactions">
              <Card className="chart-card-modern">
                <Card.Header>💵 Transactions</Card.Header>
                <Card.Body>
                  <div className="table-responsive">
                    <Table className="table-modern mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center">No transactions found</td>
                      </tr>
                    ) : (
                      transactions.map(txn => (
                        <tr key={txn.bank_txn_id}>
                          <td>{txn.bank_txn_id}</td>
                          <td>{new Date(txn.txn_date).toLocaleDateString()}</td>
                          <td>{txn.description || '-'}</td>
                          <td className="text-danger">{txn.debit ? txn.debit.toLocaleString() : '-'}</td>
                          <td className="text-success">{txn.credit ? txn.credit.toLocaleString() : '-'}</td>
                          <td>{txn.balance?.toLocaleString()}</td>
                          <td>
                            {txn.is_reconciled ? (
                              <Badge bg="success"><FaCheckCircle /> Reconciled</Badge>
                            ) : (
                              <Badge bg="warning"><FaTimesCircle /> Pending</Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Container>
      </div>
    </>
  );
};

export default Reconciliation;
