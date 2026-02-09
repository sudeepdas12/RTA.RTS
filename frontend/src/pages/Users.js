import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Alert } from 'react-bootstrap';
import { FaEdit, FaTrash, FaUsers } from 'react-icons/fa';
import { toast } from 'react-toastify';
import NavigationBar from '../components/NavigationBar';
import api from '../services/api';
import { pendingService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/dashboard.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role_id: '',
    status: 'Active'
  });

  // recent audit entries for users
  const [recentChanges, setRecentChanges] = useState([]);
  const [userPendingHistory, setUserPendingHistory] = useState([]);
  const [userPendingLoading, setUserPendingLoading] = useState(false);

  // Auth & permissions
  const { user: currentUserAuth, hasPermission } = useAuth();


  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchRecentChanges();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get('/users/roles/');
      setRoles(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      setRoles([]);
    }
  };

  const fetchRecentChanges = async () => {
    try {
      const response = await api.get('/audit/', { params: { table: 'users' } });
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setRecentChanges(data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch recent changes:', error);
      setRecentChanges([]);
    }
  };

  const fetchUserPendingRequests = async (userId) => {
    setUserPendingLoading(true);
    try {
      const res = await pendingService.getAll({ target_user: userId });
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setUserPendingHistory(data.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch user pending requests', err);
      setUserPendingHistory([]);
    } finally {
      setUserPendingLoading(false);
    }
  };

  const handleShowModal = (user = null) => {
    if (user) {
      // Normalize role id (API may return nested role object or id)
      const role_id = user.role?.role_id || user.role || '';
      setCurrentUser({ ...user, role_id, password: '' });
      setEditMode(true);

      // fetch pending history for this user
      fetchUserPendingRequests(user.user_id);
    } else {
      setCurrentUser({
        username: '',
        full_name: '',
        email: '',
        password: '',
        role_id: '',
        status: 'Active'
      });
      setEditMode(false);
      setUserPendingHistory([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
  };

  const handleSave = async () => {
    try {
      if (!editMode && !hasPermission('users', 'create')) {
        toast.error('You do not have permission to create users');
        return;
      }
      if (editMode && !hasPermission('users', 'update')) {
        toast.error('You do not have permission to update users');
        return;
      }

      if (editMode) {
        await api.put(`/users/${currentUser.user_id}/`, currentUser);
        toast.success('User updated successfully');
      } else {
        await api.post('/users/', currentUser);
        toast.success('User created successfully');
      }
      fetchUsers();
      fetchRecentChanges();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/users/${id}/`);
        toast.success('User deleted successfully');
        fetchUsers();
        fetchRecentChanges();
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  const handlePromoteToAdmin = async (id) => {
    if (!window.confirm('Promote this user to Admin?')) return;
    try {
      const adminRole = roles.find(r => r.role_name === 'Admin');
      if (!adminRole) {
        toast.error('Admin role not found. Please create an Admin role first.');
        return;
      }
      await api.put(`/users/${id}/`, { role: adminRole.role_id });
      toast.success('User promoted to Admin');
      fetchUsers();
      fetchRecentChanges();
    } catch (error) {
      toast.error('Failed to promote user');
    }
  };

  if (loading) {
    return (
      <>
        <NavigationBar />
        <div className="loading-container-modern">
          <div className="text-center">
            <div className="loading-spinner-modern mx-auto mb-3"></div>
            <p className="fs-5 text-muted">Loading users...</p>
          </div>
        </div>
      </>
    );
  }

  // If current user lacks read permission show a nicer message
  if (!hasPermission('users', 'read')) {
    return (
      <>
        <NavigationBar />
        <div className="dashboard-container">
          <Container fluid>
            <Alert variant="warning" className="mt-4">You do not have permission to view users. Contact an administrator.</Alert>
          </Container>
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
              <h2 className="dashboard-header"><FaUsers style={{ marginRight: '0.5rem' }} /> Users Management</h2>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={8}>
              <Card className="chart-card-modern">
                <Card.Header className="d-flex justify-content-between align-items-center"><div><FaUsers style={{ marginRight: '0.5rem' }} /> Users</div>
                  {hasPermission('users', 'create') && (
                    <div>
                      <Button variant="primary" onClick={() => handleShowModal(null)}>
                        Create User
                      </Button>
                    </div>
                  )}
                </Card.Header>
                <Card.Body>
                  <div className="table-responsive table-scrollable">
                    <Table className="table-modern mb-0 table-sticky-header">
                    <thead>
                    <tr>
                      <th>Username</th>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center">No users found</td>
                      </tr>
                    ) : (
                      users.map(user => (
                        <tr key={user.user_id}>
                          <td><strong>{user.username}</strong></td>
                          <td>{user.full_name}</td>
                          <td>{user.email || '-'}</td>
                          <td><Badge bg="primary">{user.role?.role_name || 'N/A'}</Badge></td>
                          <td><Badge bg={user.status === 'Active' ? 'success' : 'danger'}>{user.status}</Badge></td>
                          <td>
                            {hasPermission('users', 'update') ? (
                              <Button size="sm" variant="outline-primary" className="me-2" onClick={() => handleShowModal(user)}>
                                <FaEdit />
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline-warning" className="me-2" onClick={() => handleShowModal(user)} title="Request change for approval">
                                Request change
                              </Button>
                            )}

                            {hasPermission('users', 'delete') ? (
                              <Button size="sm" variant="outline-danger" onClick={() => handleDelete(user.user_id)}>
                                <FaTrash />
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline-secondary" disabled title="No permission to delete">
                                <FaTrash />
                              </Button>
                            )}

                            {/* Promote to Admin (only visible to admin role) */}
                            {currentUserAuth?.role === 'Admin' && user.role?.role_name !== 'Admin' && hasPermission('users', 'update') && (
                              <Button size="sm" variant="outline-success" className="ms-2" onClick={() => handlePromoteToAdmin(user.user_id)}>
                                Promote to Admin
                              </Button>
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
            </Col>

            <Col md={4}>
              <Card className="chart-card-modern">
                <Card.Header>Recent user changes</Card.Header>
                <Card.Body>
                  { /* recent changes list will be injected here */ }
                  {recentChanges && recentChanges.length === 0 && (
                    <p className="text-muted">No recent changes found</p>
                  )}

                  {recentChanges && recentChanges.map((c) => (
                    <div key={c.audit_id} className="mb-3">
                      <div className="d-flex justify-content-between">
                        <div>
                          <strong>{new Date(c.action_time).toLocaleString()}</strong>
                        </div>
                        <div>
                          <Badge bg={c.action === 'CREATE' ? 'success' : c.action === 'DELETE' ? 'danger' : 'primary'}>{c.action}</Badge>
                        </div>
                      </div>
                      <div className="text-muted small">By {c.user?.username || c.username || 'System'}</div>
                      <div className="mt-1">{(c.new_value && c.new_value.username) ? `Created/Updated: ${c.new_value.username}` : (c.description || JSON.stringify(c.new_value || c.old_value) || '-')}</div>
                    </div>
                  ))}

                  <div className="text-end">
                    <Button variant="link" size="sm" onClick={() => window.location='/audit-logs?table=users'}>View all</Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

        <Modal show={showModal} onHide={handleCloseModal} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>{editMode ? 'Edit User' : 'Add User'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Username *</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentUser.username}
                      onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value })}
                      disabled={editMode}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Full Name *</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentUser.full_name}
                      onChange={(e) => setCurrentUser({ ...currentUser, full_name: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={currentUser.email}
                  onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
                />
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Role *</Form.Label>
                    {hasPermission('users', 'update') ? (
                      <Form.Select
                        value={currentUser.role_id}
                        onChange={(e) => setCurrentUser({ ...currentUser, role_id: e.target.value })}
                      >
                        <option value="">Select Role</option>
                        {roles.map(role => (
                          <option key={role.role_id} value={role.role_id}>{role.role_name}</option>
                        ))}
                      </Form.Select>
                    ) : (
                      <Form.Control type="text" readOnly value={roles.find(r => r.role_id === currentUser.role_id)?.role_name || currentUser.role_id || 'N/A'} />
                    )}
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Status *</Form.Label>
                    <Form.Select
                      value={currentUser.status}
                      onChange={(e) => setCurrentUser({ ...currentUser, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Password {editMode && '(leave blank to keep current)'}</Form.Label>
                <Form.Control
                  type="password"
                  value={currentUser.password}
                  onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })}
                  required={!editMode}
                />
              </Form.Group>

              {editMode && (
                <Card className="mt-3 p-3">
                  <Card.Title className="mb-2">Pending requests for this user</Card.Title>
                  {userPendingLoading ? (
                    <p className="text-muted">Loading...</p>
                  ) : userPendingHistory.length === 0 ? (
                    <p className="text-muted">No pending requests</p>
                  ) : (
                    userPendingHistory.map(req => (
                      <div key={req.change_id} className="mb-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{req.action}</strong> by {req.requested_by?.username || 'System'}
                            <div className="text-muted small">{new Date(req.requested_at).toLocaleString()}</div>
                          </div>
                          <Badge bg={req.action === 'CREATE' ? 'success' : req.action === 'DELETE' ? 'danger' : 'primary'}>{req.status}</Badge>
                        </div>
                        <div className="text-truncate small mt-1" title={JSON.stringify(req.data || req.reason || '')}>{req.data ? JSON.stringify(req.data) : (req.reason || '')}</div>
                      </div>
                    ))
                  )}
                </Card>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>

            {/* Submit for approval (maker-checker) */}
            <Button variant="outline-secondary" onClick={async () => {
              try {
                const action = editMode ? 'UPDATE' : 'CREATE';
                const payload = {
                  action,
                  data: {
                    username: currentUser.username,
                    full_name: currentUser.full_name,
                    email: currentUser.email,
                    role: currentUser.role_id,
                    status: currentUser.status,
                    password: currentUser.password || undefined,
                  }
                };
                if (editMode) payload.target_user = currentUser.user_id;
                await pendingService.create(payload);
                // notify navbar
                window.dispatchEvent(new Event('pendingChangeUpdated'));
                toast.success('Change request submitted for approval');
                handleCloseModal();
              } catch (err) {
                console.error('Failed to submit request:', err);
                toast.error('Failed to submit for approval');
              }
            }}>Submit for approval</Button>

            {((editMode && !hasPermission('users', 'update')) || (!editMode && !hasPermission('users', 'create'))) ? (
              <Button variant="primary" disabled title="You don't have permission to perform this action">
                {editMode ? 'Update' : 'Create'}
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSave}>
                {editMode ? 'Update' : 'Create'}
              </Button>
            )}
          </Modal.Footer>
        </Modal>
        </Container>
      </div>
    </>
  );
};

export default Users;