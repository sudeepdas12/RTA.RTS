import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Badge } from 'react-bootstrap';
import { FaGavel, FaCheck, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import NavigationBar from '../components/NavigationBar';
import { pendingService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/dashboard.css';

const PendingApprovals = () => {
  const [pending, setPending] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const { hasPermission } = useAuth();

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const response = await pendingService.getAll({ status: 'PENDING' });
      setPending(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Failed to fetch pending changes', error);
      toast.error('Failed to fetch pending changes');
      setPending([]);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this request?')) return;
    try {
      await pendingService.approve(id);      // notify navbar & other components
      window.dispatchEvent(new Event('pendingChangeUpdated'));      toast.success('Approved');
      fetchPending();
    } catch (error) {
      console.error('Approve failed', error);
      toast.error('Approve failed');
    }
  };

  const handleReject = (item) => {
    setRejectTarget(item);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    try {
      await pendingService.reject(rejectTarget.change_id, { reason: rejectReason });      // notify navbar & other components
      window.dispatchEvent(new Event('pendingChangeUpdated'));      toast.success('Rejected');
      setShowRejectModal(false);
      fetchPending();
    } catch (error) {
      console.error('Reject failed', error);
      toast.error('Reject failed');
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="dashboard-container">
        <Container fluid>
          <Row className="mb-4">
            <Col>
              <h2 className="dashboard-header"><FaGavel className="me-2" /> Pending Approvals</h2>
            </Col>
          </Row> 

          <Card className="chart-card-modern">
            <Card.Header>Pending User Change Requests</Card.Header>
            <Card.Body>
              <div className="table-responsive table-scrollable">
                <Table className="table-modern mb-0 table-sticky-header">
                  <thead>
                    <tr>
                      <th>Requested At</th>
                      <th>Requested By</th>
                      <th>Action</th>
                      <th>Target</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center">No pending requests</td>
                      </tr>
                    ) : (
                      pending.map(p => (
                        <tr key={p.change_id}>
                          <td>{new Date(p.requested_at).toLocaleString()}</td>
                          <td>{p.requested_by?.username || '-'}</td>
                          <td><Badge bg={p.action === 'CREATE' ? 'success' : p.action === 'DELETE' ? 'danger' : 'primary'}>{p.action}</Badge></td>
                          <td>{p.target_user?.username || '-'}</td>
                          <td className="text-truncate truncate-max-300" title={JSON.stringify(p.data || p.reason || '')}>{p.data ? JSON.stringify(p.data) : '-'}</td>
                          <td>{p.status}</td>
                          <td>
                            {hasPermission('users', 'approve') ? (
                              <>
                                <Button size="sm" variant="success" className="me-2" onClick={() => handleApprove(p.change_id)}><FaCheck /></Button>
                                <Button size="sm" variant="danger" onClick={() => handleReject(p)}><FaTimes /></Button>
                              </>
                            ) : (
                              <small className="text-muted">No permission</small>
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

        </Container>
      </div>

      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Reason (optional)</Form.Label>
              <Form.Control as="textarea" rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmReject}>Reject</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PendingApprovals;
