-- ======================================================
-- RTA/RTS Debenture Interest & Stock Dividend Management System
-- PostgreSQL Database Schema
-- ======================================================

-- Drop existing tables if any (in reverse order of dependencies)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS reconciliation CASCADE;
DROP TABLE IF EXISTS bank_transactions CASCADE;
DROP TABLE IF EXISTS bank_statements CASCADE;
DROP TABLE IF EXISTS dividend_payables CASCADE;
DROP TABLE IF EXISTS interest_payables CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- ======================================================
-- MASTER TABLES
-- ======================================================

-- Companies Master
CREATE TABLE companies (
    company_id SERIAL PRIMARY KEY,
    company_code VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    sector_type VARCHAR(50) CHECK (sector_type IN ('Public','Private')),
    interest_tax_status VARCHAR(50) CHECK (interest_tax_status IN ('Taxable','Exempted')),
    pan_no VARCHAR(50),
    bank_account_no VARCHAR(50),
    bank_name VARCHAR(100),
    status VARCHAR(10) DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_companies_code ON companies(company_code);
CREATE INDEX idx_companies_status ON companies(status);

-- Fiscal Year Settings
CREATE TABLE fiscal_year_settings (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    fiscal_year VARCHAR(20) NOT NULL,
    interest_rate NUMERIC(5,2) DEFAULT 7.00,
    tax_rate NUMERIC(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (company_id, fiscal_year)
);

CREATE INDEX idx_fiscal_year_settings_company ON fiscal_year_settings(company_id);
CREATE INDEX idx_fiscal_year_settings_fiscal_year ON fiscal_year_settings(fiscal_year);

-- Clients / Shareholders Master
CREATE TABLE clients (
    client_id SERIAL PRIMARY KEY,
    client_code VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    company_id INT REFERENCES companies(company_id) ON DELETE SET NULL,
    boid VARCHAR(50) UNIQUE,
    holder_type VARCHAR(50) CHECK (holder_type IN ('Public','Promoter','Institution')),
    pan_or_citizenship VARCHAR(50),
    bank_account_no VARCHAR(50),
    bank_name VARCHAR(100),
    status VARCHAR(10) DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_clients_code ON clients(client_code);
CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_clients_holder_type ON clients(holder_type);
CREATE INDEX idx_clients_status ON clients(status);

-- Roles Table
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(200),
    email VARCHAR(100),
    password_hash TEXT NOT NULL,
    role_id INT REFERENCES roles(role_id) ON DELETE SET NULL,
    status VARCHAR(10) DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_status ON users(status);

-- ======================================================
-- TRANSACTION TABLES
-- ======================================================

-- Interest Payables
CREATE TABLE interest_payables (
    interest_id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
    client_id INT REFERENCES clients(client_id) ON DELETE CASCADE,
    instrument_ref VARCHAR(100),
    allotted_quantity INT,
    principal_amount NUMERIC(15,2),
    interest_rate NUMERIC(5,2),
    interest_per_day NUMERIC(10,4),
    interest_pumori NUMERIC(15,2),
    tax_rate NUMERIC(5,2),
    tax_exempted BOOLEAN DEFAULT FALSE,
    bank_code VARCHAR(20),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    lot VARCHAR(50),
    approved_date DATE,
    remarks TEXT,
    gross_interest NUMERIC(15,2) NOT NULL CHECK (gross_interest >= 0),
    tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    net_payable NUMERIC(15,2) NOT NULL CHECK (net_payable >= 0),
    due_date DATE NOT NULL,
    payment_status VARCHAR(20) CHECK (payment_status IN ('Pending','Paid','Partial')) DEFAULT 'Pending',
    payment_date DATE,
    payment_reference VARCHAR(100),
    created_by_id INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interest_company ON interest_payables(company_id);
CREATE INDEX idx_interest_client ON interest_payables(client_id);
CREATE INDEX idx_interest_status ON interest_payables(payment_status);
CREATE INDEX idx_interest_due_date ON interest_payables(due_date);

-- Dividend Payables
CREATE TABLE dividend_payables (
    dividend_id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(company_id) ON DELETE CASCADE,
    client_id INT REFERENCES clients(client_id) ON DELETE CASCADE,
    shares_held NUMERIC(15,2) CHECK (shares_held >= 0),
    gross_dividend NUMERIC(15,2) CHECK (gross_dividend >= 0),
    tax_amount NUMERIC(15,2) DEFAULT 0 CHECK (tax_amount >= 0),
    net_payable NUMERIC(15,2) CHECK (net_payable >= 0),
    payment_status VARCHAR(20) CHECK (payment_status IN ('Pending','Paid','Partial')) DEFAULT 'Pending',
    payment_date DATE,
    payment_reference VARCHAR(100),
    fiscal_year VARCHAR(20),
    created_by_id INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dividend_company ON dividend_payables(company_id);
CREATE INDEX idx_dividend_client ON dividend_payables(client_id);
CREATE INDEX idx_dividend_status ON dividend_payables(payment_status);
CREATE INDEX idx_dividend_fiscal_year ON dividend_payables(fiscal_year);

-- ======================================================
-- BANK & RECONCILIATION TABLES
-- ======================================================

-- Bank Statements
CREATE TABLE bank_statements (
    bank_stmt_id SERIAL PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    account_no VARCHAR(50) NOT NULL,
    statement_from DATE NOT NULL,
    statement_to DATE NOT NULL,
    uploaded_by_id INT REFERENCES users(user_id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    file_name VARCHAR(255),
    total_debit NUMERIC(15,2) DEFAULT 0,
    total_credit NUMERIC(15,2) DEFAULT 0
);

CREATE INDEX idx_bank_stmt_dates ON bank_statements(statement_from, statement_to);
CREATE INDEX idx_bank_stmt_bank ON bank_statements(bank_name);

-- Bank Transactions
CREATE TABLE bank_transactions (
    bank_txn_id SERIAL PRIMARY KEY,
    bank_stmt_id INT REFERENCES bank_statements(bank_stmt_id) ON DELETE CASCADE,
    txn_date DATE NOT NULL,
    reference_no VARCHAR(100),
    debit NUMERIC(15,2) DEFAULT 0,
    credit NUMERIC(15,2) DEFAULT 0,
    balance NUMERIC(15,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bank_txn_stmt ON bank_transactions(bank_stmt_id);
CREATE INDEX idx_bank_txn_date ON bank_transactions(txn_date);
CREATE INDEX idx_bank_txn_ref ON bank_transactions(reference_no);

-- Reconciliation Table
CREATE TABLE reconciliation (
    recon_id SERIAL PRIMARY KEY,
    bank_txn_id INT REFERENCES bank_transactions(bank_txn_id) ON DELETE CASCADE,
    source_type VARCHAR(50) CHECK (source_type IN ('Interest','Dividend')),
    source_id INT NOT NULL,
    matched_amount NUMERIC(15,2) NOT NULL,
    recon_status VARCHAR(20) CHECK (recon_status IN ('Matched','Partial','Exception')) DEFAULT 'Matched',
    notes TEXT,
    reconciled_by_id INT REFERENCES users(user_id),
    reconciled_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recon_bank_txn ON reconciliation(bank_txn_id);
CREATE INDEX idx_recon_source ON reconciliation(source_type, source_id);
CREATE INDEX idx_recon_status ON reconciliation(recon_status);

-- ======================================================
-- AUDIT LOG TABLE
-- ======================================================

CREATE TABLE audit_logs (
    audit_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    action_time TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_table ON audit_logs(table_name);
CREATE INDEX idx_audit_time ON audit_logs(action_time);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- ======================================================
-- INITIAL DATA - ROLES
-- ======================================================

INSERT INTO roles (role_name, permissions, description) VALUES
('Admin', '{"companies": ["create", "read", "update", "delete"], "clients": ["create", "read", "update", "delete"], "users": ["create", "read", "update", "delete"], "interest_payables": ["create", "read", "update", "delete"], "dividend_payables": ["create", "read", "update", "delete"], "reconciliation": ["create", "read", "update", "delete"], "reports": ["read", "export"], "audit": ["read"], "settings": ["manage"]}', 'Full system access'),
('Finance Operator', '{"companies": ["read"], "clients": ["read"], "interest_payables": ["create", "read", "update"], "dividend_payables": ["create", "read", "update"], "bank_statements": ["create", "read"], "reports": ["read", "export"]}', 'Create and manage payables'),
('Reconciliation Officer', '{"companies": ["read"], "clients": ["read"], "interest_payables": ["read"], "dividend_payables": ["read"], "bank_statements": ["read"], "reconciliation": ["create", "read", "update"], "reports": ["read", "export"]}', 'Handle bank reconciliation'),
('Auditor', '{"companies": ["read"], "clients": ["read"], "interest_payables": ["read"], "dividend_payables": ["read"], "reconciliation": ["read"], "reports": ["read", "export"], "audit": ["read"]}', 'Read-only access with audit'),
('Report Viewer', '{"reports": ["read", "export"]}', 'View and export reports only');

-- ======================================================
-- INITIAL DATA - DEFAULT ADMIN USER
-- Password: admin123 (hashed with Django's default pbkdf2_sha256)
-- ======================================================

INSERT INTO users (username, full_name, email, password_hash, role_id, status)
VALUES ('admin', 'System Administrator', 'admin@rta.gov.np', 
        'pbkdf2_sha256$260000$XYZ$dummyhash', 
        (SELECT role_id FROM roles WHERE role_name = 'Admin'), 
        'Active');

-- ======================================================
-- VIEWS FOR REPORTING
-- ======================================================

-- View: Interest Payables Summary by Company
CREATE VIEW vw_interest_summary_by_company AS
SELECT 
    c.company_id,
    c.company_code,
    c.company_name,
    c.sector_type,
    COUNT(ip.interest_id) as total_records,
    SUM(ip.gross_interest) as total_gross,
    SUM(ip.tax_amount) as total_tax,
    SUM(ip.net_payable) as total_net,
    SUM(CASE WHEN ip.payment_status = 'Paid' THEN ip.net_payable ELSE 0 END) as paid_amount,
    SUM(CASE WHEN ip.payment_status = 'Pending' THEN ip.net_payable ELSE 0 END) as pending_amount
FROM companies c
LEFT JOIN interest_payables ip ON c.company_id = ip.company_id
GROUP BY c.company_id, c.company_code, c.company_name, c.sector_type;

-- View: Dividend Payables Summary by Company
CREATE VIEW vw_dividend_summary_by_company AS
SELECT 
    c.company_id,
    c.company_code,
    c.company_name,
    COUNT(dp.dividend_id) as total_records,
    SUM(dp.shares_held) as total_shares,
    SUM(dp.gross_dividend) as total_gross,
    SUM(dp.tax_amount) as total_tax,
    SUM(dp.net_payable) as total_net,
    SUM(CASE WHEN dp.payment_status = 'Paid' THEN dp.net_payable ELSE 0 END) as paid_amount,
    SUM(CASE WHEN dp.payment_status = 'Pending' THEN dp.net_payable ELSE 0 END) as pending_amount
FROM companies c
LEFT JOIN dividend_payables dp ON c.company_id = dp.company_id
GROUP BY c.company_id, c.company_code, c.company_name;

-- View: Client Payables Summary
CREATE VIEW vw_client_payables_summary AS
SELECT 
    cl.client_id,
    cl.client_code,
    cl.full_name,
    cl.holder_type,
    COUNT(DISTINCT ip.interest_id) as interest_count,
    COUNT(DISTINCT dp.dividend_id) as dividend_count,
    COALESCE(SUM(ip.net_payable), 0) as total_interest,
    COALESCE(SUM(dp.net_payable), 0) as total_dividend,
    COALESCE(SUM(ip.net_payable), 0) + COALESCE(SUM(dp.net_payable), 0) as total_payable
FROM clients cl
LEFT JOIN interest_payables ip ON cl.client_id = ip.client_id
LEFT JOIN dividend_payables dp ON cl.client_id = dp.client_id
GROUP BY cl.client_id, cl.client_code, cl.full_name, cl.holder_type;

-- ======================================================
-- FUNCTIONS & TRIGGERS
-- ======================================================

-- Function: Update timestamp on record update
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Companies
CREATE TRIGGER trg_companies_update
BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger: Clients
CREATE TRIGGER trg_clients_update
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger: Users
CREATE TRIGGER trg_users_update
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger: Interest Payables
CREATE TRIGGER trg_interest_update
BEFORE UPDATE ON interest_payables
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger: Dividend Payables
CREATE TRIGGER trg_dividend_update
BEFORE UPDATE ON dividend_payables
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ======================================================
-- GRANT PERMISSIONS (Optional - for specific database user)
-- ======================================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rta_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rta_user;

-- ======================================================
-- END OF SCHEMA
-- ======================================================
