import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaLock, FaBuilding } from 'react-icons/fa';

const Login = () => {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(credentials);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="d-flex align-items-center justify-content-center vh-100-container">
      <Row className="justify-content-center align-items-center w-100">
        <Col md={4}>
          <Card className="chart-card-modern card-modern-rounded">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <div className="login-stat-icon mx-auto mb-3">
                  <FaBuilding style={{ fontSize: '2rem' }} />
                </div>
                <h2 className="fw-bold text-heading-dark" style={{ marginBottom: '8px' }}>RTA/RTS System</h2>
                <p className="text-muted text-subtitle">Debenture Interest & Stock Dividend Management</p>
              </div>

              {error && <Alert variant="danger" className="mb-3 alert-modern">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                  <Form.Label className="form-label-modern"><FaUser className="me-2" /> Username</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter your username"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    required
                    disabled={loading}
                    className="form-control-modern"
                  />
                </Form.Group>

                <Form.Group className="mb-5">
                  <Form.Label className="form-label-modern"><FaLock className="me-2" /> Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    required
                    disabled={loading}
                    className="form-control-modern"
                  />
                </Form.Group>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 modern-button" 
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </Form>

              <div className="text-center mt-5">
                <div className="login-demo mx-auto">
                  <small className="text-body-medium">
                    Demo Credentials: <br />
                    <strong className="text-heading-primary">admin / admin123</strong>
                  </small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
