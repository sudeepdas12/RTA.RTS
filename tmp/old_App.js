import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InterestCompanyWise from './pages/interest/InterestCompanyWise';
import InterestPrivateSector from './pages/interest/InterestPrivateSector';
import InterestInstitution from './pages/interest/InterestInstitution';
import InterestTaxExemptedSector from './pages/interest/InterestTaxExemptedSector';
import InterestClientWise from './pages/interest/InterestClientWise';
import InterestDashboard from './pages/interest/InterestDashboard';
import InterestSummaryReports from './pages/interest/InterestSummaryReports';
import DividendCompanyWise from './pages/dividend/DividendCompanyWise';
import DividendPublic from './pages/dividend/DividendPublic';
import DividendPromoter from './pages/dividend/DividendPromoter';
import DividendPrivate from './pages/dividend/DividendPrivate';
import DividendTaxExempted from './pages/dividend/DividendTaxExempted';
import DividendClientWise from './pages/dividend/DividendClientWise';
import DividendDashboard from './pages/dividend/DividendDashboard';
import DividendSummaryReports from './pages/dividend/DividendSummaryReports';
import Companies from './pages/Companies';
import Clients from './pages/Clients';
import Reconciliation from './pages/Reconciliation';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Users from './pages/Users';
import PendingApprovals from './pages/PendingApprovals';
import Uploads from './pages/Uploads';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastContainer position="top-right" autoClose={3000} />
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/interest/company-wise"
              element={
                <PrivateRoute>
                  <InterestCompanyWise />
                </PrivateRoute>
              }
            />
            <Route
              path="/interest/private-sector"
              element={
                <PrivateRoute>
                  <InterestPrivateSector />
                </PrivateRoute>
              }
            />
            <Route
              path="/interest/public-sector"
              element={
                <PrivateRoute>
                  <InterestPrivateSector />
                </PrivateRoute>
              }
            />
            <Route
              path="/interest/tax-exempted-sector"
              element={
                <PrivateRoute>
                  <InterestTaxExemptedSector />
                </PrivateRoute>
              }
            />
            <Route
              path="/interest/institution"
              element={
                <PrivateRoute>
                  <InterestInstitution />
                </PrivateRoute>
              }
            />
            <Route
              path="/interest/client-wise"
              element={
                <PrivateRoute>
                  <InterestClientWise />
                </PrivateRoute>
              }
            />
            <Route
              path="/interest/dashboard"
              element={
                <PrivateRoute>
                  <InterestDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/interest/summary-reports"
              element={
                <PrivateRoute>
                  <InterestSummaryReports />
                </PrivateRoute>
              }
            />
            <Route
              path="/dividend/company-wise"
              element={
                <PrivateRoute>
                  <DividendCompanyWise />
                </PrivateRoute>
              }
            />
            <Route
              path="/dividend/public"
              element={
                <PrivateRoute>
                  <DividendPublic />
                </PrivateRoute>
              }
            />
            <Route
              path="/dividend/promoter"
              element={
                <PrivateRoute>
                  <DividendPromoter />
                </PrivateRoute>
              }
            />
            <Route
              path="/dividend/private"
              element={
                <PrivateRoute>
                  <DividendPrivate />
                </PrivateRoute>
              }
            />
            <Route
              path="/dividend/tax-exempted"
              element={
                <PrivateRoute>
                  <DividendTaxExempted />
                </PrivateRoute>
              }
            />
            <Route
              path="/dividend/client-wise"
              element={
                <PrivateRoute>
                  <DividendClientWise />
                </PrivateRoute>
              }
            />
            <Route
              path="/dividend/dashboard"
              element={
                <PrivateRoute>
                  <DividendDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dividend/summary-reports"
              element={
                <PrivateRoute>
                  <DividendSummaryReports />
                </PrivateRoute>
              }
            />
            <Route
              path="/companies"
              element={
                <PrivateRoute>
                  <Companies />
                </PrivateRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <PrivateRoute>
                  <Clients />
                </PrivateRoute>
              }
            />
            <Route
              path="/reconciliation"
              element={
                <PrivateRoute>
                  <Reconciliation />
                </PrivateRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <PrivateRoute>
                  <Reports />
                </PrivateRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <PrivateRoute>
                  <AuditLogs />
                </PrivateRoute>
              }
            />
            <Route
              path="/pending-approvals"
              element={
                <PrivateRoute>
                  <PendingApprovals />
                </PrivateRoute>
              }
            />
            <Route
              path="/users"
              element={
                <PrivateRoute>
                  <Users />
                </PrivateRoute>
              }
            />
            <Route
              path="/uploads"
              element={
                <PrivateRoute>
                  <Uploads />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Footer />
        </ErrorBoundary>
      </AuthProvider>
    </Router>
  );
}

export default App;
