import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Container, Card, Row, Col, Table, Form, Button, Modal, 
  Badge, ButtonGroup, InputGroup, Tabs, Tab
} from 'react-bootstrap';
import { 
  FaChartBar, FaBuilding, FaUsers, FaMoneyBill, FaPercentage,
  FaSearch, FaDownload, FaPrint, FaFilter, FaTimes,
  FaEye, FaChevronDown, FaChevronRight, FaColumns,
  FaUniversity, FaCalendarAlt, FaExchangeAlt, FaGlobe, FaExternalLinkAlt,
  FaFileExcel, FaCheckCircle, FaExclamationTriangle, FaTrash
} from 'react-icons/fa';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import NavigationBar from '../../components/NavigationBar';
import api from '../../services/api';
import { toast } from 'react-toastify';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const API_BASE = '/payables/debenture/';
const DEFAULT_COLUMNS = ['sn', 'applicant_name', 'alloted_quantity', 'amount', 'roundup', 'bank_name', 'status'];

const FISCAL_YEARS = [
  { label: 'All Years', value: '' },
  { label: '2081/82', value: '2081/82' },
  { label: '2080/81', value: '2080/81' },
  { label: '2079/80', value: '2079/80' },
  { label: '2078/79', value: '2078/79' },
  { label: '2077/78', value: '2077/78' },
  { label: '2076/77', value: '2076/77' },
  { label: '2026', value: '2026' },
  { label: '2025', value: '2025' },
  { label: '2024', value: '2024' },
  { label: '2023', value: '2023' },
  { label: '2022', value: '2022' },
];

const ALL_COLUMNS = [
  { key: 'sn', label: 'S.N' },
  { key: 'boid', label: 'BOID' },
  { key: 'applicant_name', label: 'Applicant Name' },
  { key: 'father_mother_name', label: 'Father/Mother' },
  { key: 'grandfather_spouse_name', label: 'Grandfather/Spouse' },
  { key: 'citizenship_number', label: 'Citizenship No.' },
  { key: 'issued_from', label: 'Issued From' },
  { key: 'alloted_quantity', label: 'Units' },
  { key: 'amount', label: 'Amount (NPR)' },
  { key: 'period_interest', label: 'Gross Interest' },
  { key: 'tax', label: 'TDS' },
  { key: 'net_interest_payable', label: 'Net Interest' },
  { key: 'roundup', label: 'Net Payable' },
  { key: 'bank_code', label: 'Bank Code' },
  { key: 'bank_name', label: 'Bank' },
  { key: 'account_number', label: 'Account No.' },
  { key: 'lot', label: 'Lot' },
  { key: 'status', label: 'Status' },
  { key: 'approved_date', label: 'Approved Date' },
];

const fmt = (num) => {
  if (num === null || num === undefined || num === 0) return '0.00';
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')}-${mo[d.getMonth()]}-${d.getFullYear()}`;
};

const statusVar = (s) => {
  if (!s) return 'secondary';
  const u = s.toUpperCase();
  if (u === 'SUCCESS') return 'success';
  if (u.includes('REJECT')) return 'warning';
  if (u === 'MERGER') return 'info';
  return 'secondary';
};

const statusRow = (s) => {
  if (!s) return '';
  const u = s.toUpperCase();
  if (u === 'SUCCESS') return 'row-success';
  if (u.includes('REJECT')) return 'row-reject';
  return '';
};

const InterestReconciliation = () => {
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [allData, setAllData] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedBanks, setSelectedBanks] = useState([]);
  const [selectedLot, setSelectedLot] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  const [sectorType, setSectorType] = useState('all');
  const [taxStatus, setTaxStatus] = useState('all');
  const [minUnits, setMinUnits] = useState('');
  const [maxUnits, setMaxUnits] = useState('');
  const [minPayable, setMinPayable] = useState('');
  const [maxPayable, setMaxPayable] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortCol, setSortCol] = useState('sn');
  const [sortDir, setSortDir] = useState('asc');
  const [visibleCols, setVisibleCols] = useState(DEFAULT_COLUMNS);
  const [showColModal, setShowColModal] = useState(false);
  const [selRecord, setSelRecord] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showBankSummary, setShowBankSummary] = useState(true);
  const [showCharts, setShowCharts] = useState(false);
  const [websites, setWebsites] = useState([]);
  const [activeTab, setActiveTab] = useState('data');

  // Load companies from DB
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [compResp, webResp] = await Promise.all([
          api.get(`${API_BASE}companies/`),
          api.get(`${API_BASE}website_links/`).catch(() => ({ data: [] })),
        ]);
        const companiesList = compResp.data || [];
        setCompanies(companiesList);
        setWebsites(webResp.data || []);
        if (companiesList.length > 0) {
          const defaultComp = companiesList[0];
          setActiveCompany(defaultComp);
          const dataResp = await api.get(`${API_BASE}?company_code=${encodeURIComponent(defaultComp.company_code)}&page_size=10000`);
          const results = dataResp.data.results || dataResp.data;
          const records = Array.isArray(results) ? results : [];
          setAllData(records);
          setData(records);
        }
        setError(null);
      } catch (err) {
        setError('Failed to load data: ' + (err.response?.data?.detail || err.message));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Switch company
  const loadData = async () => {
    if (!activeCompany) return;
    try {
      const dataResp = await api.get(`${API_BASE}?company_code=${encodeURIComponent(activeCompany.company_code)}&page_size=10000`);
      const results = dataResp.data.results || dataResp.data;
      const records = Array.isArray(results) ? results : [];
      setAllData(records);
      setData(records);
    } catch (err) {
      toast.error('Failed to reload data');
    }
  };

  const switchCompany = async (companyCode) => {
    const company = companies.find(c => c.company_code === companyCode);
    if (!company || company.company_code === activeCompany?.company_code) return;
    setLoading(true);
    setActiveCompany(company);
    setCurrentPage(1);
    clearFilters();
    try {
      const dataResp = await api.get(`${API_BASE}?company_code=${encodeURIComponent(companyCode)}&page_size=10000`);
      const results = dataResp.data.results || dataResp.data;
      const records = Array.isArray(results) ? results : [];
      setAllData(records);
      setData(records);
      setError(null);
    } catch (err) {
      setError('Failed to load company data: ' + (err.response?.data?.detail || err.message));
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const uniqueBanks = useMemo(() => {
    const s = new Set();
    data.forEach(r => { if (r.bank_name) s.add(r.bank_name); });
    return Array.from(s).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(r => {
      if (globalSearch) {
        const t = globalSearch.toLowerCase();
        const txt = [r.applicant_name, r.boid, r.citizenship_number, r.account_number, r.father_mother_name, r.grandfather_spouse_name, r.issued_from, r.bank_name, r.bank_code, r.lot, r.remarks].join(' ').toLowerCase();
        if (!txt.includes(t)) return false;
      }
      if (selectedBanks.length > 0 && !selectedBanks.includes(r.bank_name)) return false;
      if (selectedLot !== 'all') {
        if (selectedLot === 'other') { if (r.lot === 'TEKU LOT 2' || r.lot === 'THAPATHALI LOT 3') return false; }
        else if (r.lot !== selectedLot) return false;
      }
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      if (sectorType !== 'all' && r.sector_type !== sectorType) return false;
      if (taxStatus !== 'all' && r.tax_status !== taxStatus) return false;
      if (minUnits !== '' && r.alloted_quantity < Number(minUnits)) return false;
      if (maxUnits !== '' && r.alloted_quantity > Number(maxUnits)) return false;
      if (minPayable !== '' && r.roundup < Number(minPayable)) return false;
      if (maxPayable !== '' && r.roundup > Number(maxPayable)) return false;
      return true;
    });
  }, [data, globalSearch, selectedBanks, selectedLot, selectedStatus, sectorType, taxStatus, minUnits, maxUnits, minPayable, maxPayable]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortCol, sortDir]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const summaryStats = useMemo(() => ({
    totalApplicants: filteredData.length,
    totalPrincipal: filteredData.reduce((s, r) => s + (r.amount || 0), 0),
    totalGrossInterest: filteredData.reduce((s, r) => s + (r.period_interest || 0), 0),
    totalTDS: filteredData.reduce((s, r) => s + (r.tax || 0), 0),
    totalNetPayable: filteredData.reduce((s, r) => s + (r.roundup || 0), 0),
    uniqueBankCount: new Set(filteredData.map(r => r.bank_name).filter(Boolean)).size,
  }), [filteredData]);

  const bankSummary = useMemo(() => {
    const m = {};
    filteredData.forEach(r => {
      const b = r.bank_name || 'Unknown';
      if (!m[b]) m[b] = { bank_code: r.bank_code, count: 0, units: 0, amount: 0, gross: 0, tax: 0, net: 0 };
      m[b].count++; m[b].units += Number(r.alloted_quantity) || 0;
      m[b].amount += Number(r.amount) || 0; m[b].gross += Number(r.period_interest) || 0;
      m[b].tax += Number(r.tax) || 0; m[b].net += Number(r.roundup) || 0;
    });
    return Object.entries(m).map(([n, v]) => ({ bank_name: n, ...v })).sort((a, b) => b.net - a.net);
  }, [filteredData]);

  const lotSummary = useMemo(() => {
    const m = {};
    filteredData.forEach(r => {
      const l = r.lot || '(No Lot)';
      if (!m[l]) m[l] = { count: 0, units: 0, amount: 0, net: 0 };
      m[l].count++; m[l].units += Number(r.alloted_quantity) || 0;
      m[l].amount += Number(r.amount) || 0; m[l].net += Number(r.roundup) || 0;
    });
    return Object.entries(m).map(([n, v]) => ({ lot: n, ...v })).sort((a, b) => b.net - a.net);
  }, [filteredData]);

  const companySummary = useMemo(() => {
    const m = {};
    data.forEach(r => {
      const c = r.company_code || 'Unknown';
      if (!m[c]) m[c] = { name: r.company_name || c, count: 0, amount: 0, net: 0 };
      m[c].count++; m[c].amount += Number(r.amount) || 0; m[c].net += Number(r.roundup) || 0;
    });
    return Object.entries(m).map(([code, v]) => ({ company_code: code, ...v })).sort((a, b) => b.net - a.net);
  }, [data]);

  const topBanksChart = useMemo(() => {
    const top = bankSummary.slice(0, 10);
    return {
      labels: top.map(b => b.bank_name.length > 25 ? b.bank_name.substring(0, 25) + '...' : b.bank_name),
      datasets: [{ label: 'Net Payable (NPR)', data: top.map(b => Math.round(b.net)),
        backgroundColor: 'rgba(30, 58, 95, 0.7)', borderColor: 'rgba(30, 58, 95, 1)', borderWidth: 1 }]
    };
  }, [bankSummary]);

  const lotDistChart = useMemo(() => ({
    labels: lotSummary.map(l => l.lot),
    datasets: [{ data: lotSummary.map(l => Math.round(l.net)),
      backgroundColor: ['rgba(30, 58, 95, 0.7)', 'rgba(40, 167, 69, 0.7)', 'rgba(255, 193, 7, 0.7)'],
      borderColor: ['rgba(30, 58, 95, 1)', 'rgba(40, 167, 69, 1)', 'rgba(255, 193, 7, 1)'], borderWidth: 1 }]
  }), [lotSummary]);

  const unitsHist = useMemo(() => {
    const b = { '25':0,'26-50':0,'51-100':0,'101-500':0,'501-1000':0,'1000+':0 };
    filteredData.forEach(r => { const u = Number(r.alloted_quantity)||0;
      if (u<=25) b['25']++; else if (u<=50) b['26-50']++; else if (u<=100) b['51-100']++;
      else if (u<=500) b['101-500']++; else if (u<=1000) b['501-1000']++; else b['1000+']++; });
    return { labels: Object.keys(b), datasets: [{ label: 'Applicants', data: Object.values(b),
      backgroundColor: 'rgba(30, 58, 95, 0.7)', borderColor: 'rgba(30, 58, 95, 1)', borderWidth: 1 }] };
  }, [filteredData]);

  const statusChart = useMemo(() => {
    const m = {};
    filteredData.forEach(r => { const s = r.status||'Unknown'; if (!m[s]) m[s]={count:0,amount:0}; m[s].count++; m[s].amount+=Number(r.roundup)||0; });
    const labels = Object.keys(m);
    const colors = labels.map(l => l.toUpperCase()==='SUCCESS'?'rgba(40,167,69,0.7)':l.toUpperCase().includes('REJECT')?'rgba(255,193,7,0.7)':'rgba(108,117,125,0.7)');
    return { labels, datasets: [{ data: labels.map(l=>m[l].count), backgroundColor: colors, borderWidth:1 }] };
  }, [filteredData]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d==='asc'?'desc':'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setCurrentPage(1);
  };

  const toggleCol = (k) => {
    setVisibleCols(p => { if (p.includes(k)) return k==='sn'?p:p.filter(x=>x!==k); return [...p,k]; });
  };

  const exportCSV = useCallback(() => {
    const headers = ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(c => c.label);
    const rows = filteredData.map(r => headers.map(h => {
      const col = ALL_COLUMNS.find(c => c.label === h);
      if (!col) return '';
      let val = r[col.key];
      if (typeof val === 'number') return val.toFixed(2);
      if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
      return val || '';
    }).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${activeCompany?.company_code || 'Debenture'}_Report.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredData, visibleCols, activeCompany]);

  const handleDelete = async (record) => {
    if (!window.confirm(`Are you sure you want to delete record for ${record.applicant_name}?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/payables/debenture/${record.id}/remove_record/`);
      toast.success('Record deleted successfully');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete record');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setRecordToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${filteredData.length} filtered records? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      const response = await api.post('/payables/debenture/bulk_delete/', {
        company_code: activeCompany?.company_code || undefined,
        upload_batch: undefined,
        period_from: undefined,
        period_to: undefined,
      });
      toast.success(response.data.message);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete records');
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setGlobalSearch(''); setSelectedBanks([]); setSelectedLot('all');
    setSelectedStatus('all'); setSelectedFiscalYear('');
    setSectorType('all'); setTaxStatus('all');
    setMinUnits(''); setMaxUnits('');
    setMinPayable(''); setMaxPayable(''); setCurrentPage(1);
  };

  const company = activeCompany || { company_code: '', company_name: '' };

  if (loading) return (
    <><NavigationBar /><div className="dashboard-container"><Container fluid>
      <div style={{ minHeight:'400px', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div className="text-center"><div style={{ width:50, height:50, border:'4px solid #e0e0e0', borderTopColor:'#1E3A5F', borderRadius:'50%', animation:'spin 1s linear infinite' }} className="mx-auto mb-3"></div>
        <p className="fs-5 text-muted">Loading debenture reconciliation data...</p></div>
      </div></Container></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></>
  );

  if (error) return (
    <><NavigationBar /><div className="dashboard-container"><Container fluid>
      <div className="text-center mt-5"><FaTimes size={48} className="text-danger mb-3" />
      <h4>Failed to Load Data</h4><p className="text-muted">{error}</p>
      <Button onClick={()=>window.location.reload()}>Retry</Button></div></Container></div></>
  );

  const isEmpty = data.length === 0;
  const noResults = filteredData.length === 0 && data.length > 0;

  return (
    <>
      <NavigationBar />
      <style>{`
        .row-success{background-color:rgba(40,167,69,0.08)!important}
        .row-reject{background-color:rgba(255,193,7,0.12)!important}
        .summary-card{border:none;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:transform 0.2s}
        .summary-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,0.12)}
        .summary-card .card-body{padding:1rem 1.25rem}
        .summary-card .stat-value{font-size:1.35rem;font-weight:700;margin:0;line-height:1.2}
        .summary-card .stat-label{font-size:0.78rem;color:#6c757d;margin:0;font-weight:500}
        .summary-card .stat-icon{font-size:1.5rem;opacity:0.3}
        .section-toggle{cursor:pointer;user-select:none}
        .table-modern th{cursor:pointer;white-space:nowrap;font-size:0.85rem}
        .table-modern th:hover{background-color:#f0f2f5}
        .sort-icon{margin-left:4px;font-size:0.7rem}
        .filter-label{font-size:0.75rem;font-weight:600;color:#495057;margin-bottom:2px}
        .detail-label{font-size:0.78rem;color:#6c757d;font-weight:600;margin-bottom:2px}
        .detail-value{font-size:0.95rem;margin-bottom:12px}
        @media print{.navbar-top,.navbar-menu-fullwidth,.no-print{display:none!important}.print-only{display:block!important}.card{box-shadow:none!important;border:1px solid #dee2e6!important}}
        .print-only{display:none}
        .debenture-header{background:linear-gradient(135deg,#1E3A5F 0%,#2c5282 100%);color:white;padding:20px;border-radius:12px;margin-bottom:20px}
        .debenture-header h3{margin:0;font-weight:700}
        .debenture-header small{opacity:0.85}
        .website-card{transition:transform 0.2s;border-left:4px solid #1E3A5F}
        .website-card:hover{transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,0.12)}
        .nav-tabs .nav-link.active{font-weight:700;color:#1E3A5F;border-bottom:3px solid #1E3A5F}
        .nav-tabs .nav-link{color:#6c757d;font-weight:500}
      `}</style>
      <div className="dashboard-container" style={{paddingBottom:'40px'}}>
        <Container fluid>
          <div className="print-only">
            <h2>{company.company_name}</h2>
          </div>
          {/* Header */}
          <div className="debenture-header no-print">
            <Row className="align-items-center">
              <Col><h3><FaUniversity className="me-2" />Debenture Interest</h3>
              <small>Database-backed multi-company reconciliation system</small></Col>
              <Col xs="auto" className="d-flex align-items-center gap-3">
                <Badge bg="light" text="dark">{data.length} Records</Badge>
                <Form.Select size="sm" style={{minWidth:250}} value={company.company_code} onChange={e=>switchCompany(e.target.value)}>
                  {companies.map(c => <option key={c.company_code} value={c.company_code}>{c.company_name} ({c.total_applicants} applicants)</option>)}
                </Form.Select>
                {activeCompany && <Button variant="outline-danger" size="sm" onClick={async () => {
                  if (!window.confirm(`Delete company "${activeCompany.company_name}" and all its data?`)) return;
                  setDeleting(true);
                  try {
                    await api.delete(`/companies/${activeCompany.company_id || activeCompany.id}/`);
                    toast.success('Company deleted');
                    const remaining = companies.filter(c => c.company_code !== activeCompany.company_code);
                    setCompanies(remaining);
                    if (remaining.length > 0) switchCompany(remaining[0].company_code);
                    else { setActiveCompany(null); setData([]); }
                  } catch (err) { toast.error('Failed to delete company'); }
                  finally { setDeleting(false); }
                }}><FaTrash /></Button>}
              </Col>
            </Row>
          </div>

          {/* Tabs: Data / Websites */}
          <Tabs activeKey={activeTab} onSelect={k=>setActiveTab(k)} className="mb-4 no-print">
            <Tab eventKey="data" title={<span><FaChartBar className="me-1" />Data & Analysis</span>}>
              {/* Summary Cards */}
              <Row className="g-3 mb-4">
                {[{v:summaryStats.totalApplicants,l:'Applicants',c:'#1E3A5F',i:<FaUsers />},
                  {v:fmt(summaryStats.totalPrincipal),l:'Principal',c:'#1E3A5F',i:<FaMoneyBill />},
                  {v:fmt(summaryStats.totalGrossInterest),l:'Gross Int.',c:'#28a745',i:<FaPercentage />},
                  {v:fmt(summaryStats.totalTDS),l:'TDS',c:'#dc3545',i:<FaPercentage />},
                  {v:fmt(summaryStats.totalNetPayable),l:'Net Payable',c:'#1E3A5F',i:<FaMoneyBill />},
                  {v:summaryStats.uniqueBankCount,l:'Banks',c:'#1E3A5F',i:<FaBuilding />},
                ].map((s,i) => (
                  <Col xs={6} md={4} lg={2} key={i}><Card className="summary-card h-100"><Card.Body>
                    <div className="d-flex justify-content-between"><div>
                      <p className="stat-value" style={{color:s.c}}>{s.v}</p>
                      <p className="stat-label">{s.l}</p></div>
                      <span style={{color:s.c,fontSize:'1.5rem',opacity:0.3}}>{s.i}</span></div>
                  </Card.Body></Card></Col>
                ))}
              </Row>

              {isEmpty ? <div className="text-center mt-5"><FaBuilding size={48} className="text-muted mb-3" /><h4>No Data Available</h4><p className="text-muted">Upload debenture reconciliation data via Data Center to see it here.</p></div>
              : (<>
                {/* Filters */}
                <Card className="shadow-sm mb-4 no-print"><Card.Body>
                  <div className="d-flex align-items-center mb-3"><FaFilter className="me-2 text-primary" /><h6 className="mb-0 fw-bold">Filters</h6>
                  {(globalSearch||selectedBanks.length>0||selectedLot!=='all'||selectedStatus!=='all'||selectedFiscalYear||minUnits||maxUnits||minPayable||maxPayable) &&
                    <Button variant="link" size="sm" className="ms-2 text-danger" onClick={clearFilters}><FaTimes /> Clear</Button>}
                  </div>
                  <Row className="g-2">
                    <Col md={3} lg={2}><div className="filter-label">Fiscal Year</div>
                      <Form.Select size="sm" value={selectedFiscalYear} onChange={e=>{setSelectedFiscalYear(e.target.value);setCurrentPage(1);}}>
                        {FISCAL_YEARS.map(y=><option key={y.value} value={y.value}>{y.label}</option>)}
                      </Form.Select></Col>
                    <Col md={4} lg={3}><div className="filter-label">Search</div>
                      <InputGroup size="sm"><InputGroup.Text><FaSearch /></InputGroup.Text>
                      <Form.Control placeholder="Name, BOID, Account, Bank..." value={globalSearch} onChange={e=>{setGlobalSearch(e.target.value);setCurrentPage(1);}} /></InputGroup></Col>
                    <Col md={3} lg={2}><div className="filter-label">Bank</div>
                      <Form.Select size="sm" value={selectedBanks.length===1?selectedBanks[0]:'_m'} onChange={e=>{const v=e.target.value; setSelectedBanks(v==='_'?[]:[v]); setCurrentPage(1);}}>
                        <option value="_">All Banks</option>{uniqueBanks.map(b=><option key={b} value={b}>{b}</option>)}
                      </Form.Select></Col>
                    <Col md={3} lg={1.5}><div className="filter-label">Lot</div>
                      <Form.Select size="sm" value={selectedLot} onChange={e=>{setSelectedLot(e.target.value);setCurrentPage(1);}}>
                        <option value="all">All</option><option value="TEKU LOT 2">TEKU LOT 2</option>
                        <option value="THAPATHALI LOT 3">THAPATHALI LOT 3</option><option value="other">Other</option>
                      </Form.Select></Col>
                    <Col md={3} lg={1.5}><div className="filter-label">Status</div>
                      <Form.Select size="sm" value={selectedStatus} onChange={e=>{setSelectedStatus(e.target.value);setCurrentPage(1);}}>
                        <option value="all">All</option><option value="SUCCESS">SUCCESS</option>
                        <option value="REJECT/SUCCESS">REJECT/SUCCESS</option><option value="REJECT">REJECT</option>
                      </Form.Select></Col>
                    <Col md={3} lg={2}><div className="filter-label">Section</div>
                      <Form.Select size="sm" value={sectorType} onChange={e=>{setSectorType(e.target.value);setTaxStatus(e.target.value==='Exempted'?'Exempted':'all');setCurrentPage(1);}}>
                        <option value="all">All</option><option value="Public">Public</option>
                        <option value="Private">Private</option><option value="Exempted">Tax Exempted</option>
                      </Form.Select></Col>
                    <Col md={3} lg={1.5}><div className="filter-label">Units Range</div>
                      <InputGroup size="sm"><Form.Control type="number" placeholder="Min" value={minUnits} onChange={e=>{setMinUnits(e.target.value);setCurrentPage(1);}} />
                      <InputGroup.Text>-</InputGroup.Text><Form.Control type="number" placeholder="Max" value={maxUnits} onChange={e=>{setMaxUnits(e.target.value);setCurrentPage(1);}} /></InputGroup></Col>
                    <Col md={3} lg={1.5}><div className="filter-label">Payable Range</div>
                      <InputGroup size="sm"><Form.Control type="number" placeholder="Min" value={minPayable} onChange={e=>{setMinPayable(e.target.value);setCurrentPage(1);}} />
                      <InputGroup.Text>-</InputGroup.Text><Form.Control type="number" placeholder="Max" value={maxPayable} onChange={e=>{setMaxPayable(e.target.value);setCurrentPage(1);}} /></InputGroup></Col>
                  </Row>
                </Card.Body></Card>

                {/* Bank-wise Summary */}
                <Card className="shadow-sm mb-4"><Card.Body>
                  <div className="d-flex justify-content-between align-items-center section-toggle mb-3" onClick={()=>setShowBankSummary(!showBankSummary)}>
                    <h6 className="mb-0 fw-bold"><FaBuilding className="me-2 text-primary" />Bank-wise Summary ({bankSummary.length})</h6>
                    {showBankSummary?<FaChevronDown />:<FaChevronRight />}</div>
                  {showBankSummary && <div className="table-responsive" style={{maxHeight:400,overflowY:'auto'}}>
                    <Table className="table-modern mb-0" size="sm" bordered hover>
                      <thead className="table-light" style={{position:'sticky',top:0,zIndex:1}}><tr>
                        <th>Code</th><th>Bank Name</th><th className="text-end">Applicants</th><th className="text-end">Units</th>
                        <th className="text-end">Amount</th><th className="text-end">Gross Int.</th><th className="text-end">TDS</th><th className="text-end">Net Payable</th></tr></thead>
                      <tbody>{bankSummary.map((b,i) => <tr key={i} style={{cursor:'pointer'}} onClick={()=>{setSelectedBanks([b.bank_name]);setCurrentPage(1);}}>
                        <td>{b.bank_code}</td><td>{b.bank_name}</td><td className="text-end">{b.count}</td>
                        <td className="text-end">{b.units}</td><td className="text-end">{fmt(b.amount)}</td>
                        <td className="text-end">{fmt(b.gross)}</td><td className="text-end">{fmt(b.tax)}</td>
                        <td className="text-end fw-bold">{fmt(b.net)}</td></tr>)}</tbody>
                    </Table></div>}
                </Card.Body></Card>

                {/* Lot Summary */}
                <Row className="g-3 mb-4">{lotSummary.map((l,i) => <Col xs={6} md={3} key={i}>
                  <Card className="summary-card h-100" style={{cursor:'pointer'}} onClick={()=>{setSelectedLot(l.lot==='(No Lot)'?'other':l.lot);setCurrentPage(1);}}>
                    <Card.Body><p className="stat-label">{l.lot}</p><p className="stat-value" style={{color:'#1E3A5F',fontSize:'1.2rem'}}>{l.count} applicants</p>
                    <small className="text-muted">{fmt(l.net)} net payable</small></Card.Body></Card></Col>)}</Row>

                {/* Export & Controls */}
                <div className="d-flex justify-content-between align-items-center mb-3 no-print"><div className="d-flex gap-2">
                  <Button variant="outline-primary" size="sm" onClick={exportCSV}><FaDownload className="me-1" /> CSV</Button>
                  <Button variant="outline-secondary" size="sm" onClick={()=>window.print()}><FaPrint className="me-1" /> Print</Button>
                  <Button variant="outline-info" size="sm" onClick={()=>setShowColModal(true)}><FaColumns className="me-1" /> Columns</Button>
                  <Button variant="outline-danger" size="sm" onClick={handleBulkDelete} disabled={filteredData.length===0}><FaTrash className="me-1" /> Delete Filtered ({filteredData.length})</Button></div>
                  <small className="text-muted">{filteredData.length} of {data.length} records{filteredData.length!==data.length?' (filtered)':''}</small></div>

                {noResults && <div className="text-center py-5"><FaSearch size={40} className="text-muted mb-3" /><h5>No Matching Records</h5><Button variant="outline-primary" onClick={clearFilters}>Clear Filters</Button></div>}
                {!noResults && (<>
                  <div className="table-responsive"><Table className="table-modern mb-0" bordered hover>
                    <thead className="table-light"><tr>
                      {ALL_COLUMNS.filter(c=>visibleCols.includes(c.key)).map(col=>
                        <th key={col.key} onClick={()=>handleSort(col.key)} className="text-nowrap">{col.label}
                          {sortCol===col.key&&<span className="sort-icon">{sortDir==='asc'?'▲':'▼'}</span>}</th>)}
                      <th className="text-center no-print">View</th>
                      <th className="text-center no-print">Delete</th></tr></thead>
                    <tbody>{paginatedData.map((r,idx) => <tr key={r.id||idx} className={statusRow(r.status)}>
                      {ALL_COLUMNS.filter(c=>visibleCols.includes(c.key)).map(col=>
                        <td key={col.key}>{col.key==='sn'?(currentPage-1)*pageSize+idx+1:
                          ['amount','period_interest','tax','net_interest_payable','roundup'].includes(col.key)?fmt(r[col.key]):
                          col.key==='alloted_quantity'?r[col.key]:col.key==='approved_date'?fmtDate(r[col.key]):
                          col.key==='status'?<Badge bg={statusVar(r[col.key])}>{r[col.key]}</Badge>:
                          col.key==='applicant_name'?<strong>{r[col.key]}</strong>:r[col.key]||'-'}</td>)}
                      <td className="text-center no-print"><Button variant="outline-primary" size="sm" onClick={()=>{setSelRecord(r);setShowDetail(true);}}><FaEye /></Button></td>
                      <td className="text-center no-print"><Button variant="outline-danger" size="sm" onClick={()=>{setRecordToDelete(r);setShowDeleteModal(true);}}><FaTrash /></Button></td>
                    </tr>)}</tbody>
                  </Table></div>
                  <div className="d-flex justify-content-between align-items-center mt-3 no-print"><div className="d-flex gap-2">
                    <Form.Select size="sm" style={{width:'auto'}} value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setCurrentPage(1);}}>
                      <option value={25}>25/page</option><option value={50}>50/page</option><option value={100}>100/page</option></Form.Select>
                    <span className="text-muted small">Page {currentPage} of {totalPages||1}</span></div>
                    <ButtonGroup size="sm">
                      <Button variant="outline-secondary" disabled={currentPage===1} onClick={()=>setCurrentPage(1)}>««</Button>
                      <Button variant="outline-secondary" disabled={currentPage===1} onClick={()=>setCurrentPage(p=>Math.max(1,p-1))}>«</Button>
                      {Array.from({length:Math.min(5,totalPages)},(_,i)=>{let pn;const tp=totalPages,cp=currentPage;
                        if(tp<=5)pn=i+1;else if(cp<=3)pn=i+1;else if(cp>=tp-2)pn=tp-4+i;else pn=cp-2+i;
                        return <Button key={pn} variant={cp===pn?'primary':'outline-secondary'} onClick={()=>setCurrentPage(pn)}>{pn}</Button>;})}
                      <Button variant="outline-secondary" disabled={currentPage===totalPages||totalPages===0} onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))}>»</Button>
                      <Button variant="outline-secondary" disabled={currentPage===totalPages||totalPages===0} onClick={()=>setCurrentPage(totalPages)}>»»</Button>
                    </ButtonGroup></div>
                </>)}

                {/* Charts */}
                <Card className="shadow-sm mt-4 no-print"><Card.Body>
                  <div className="d-flex justify-content-between align-items-center section-toggle mb-3" onClick={()=>setShowCharts(!showCharts)}>
                    <h6 className="mb-0 fw-bold"><FaChartBar className="me-2 text-primary" />Statistics & Charts</h6>
                    {showCharts?<FaChevronDown />:<FaChevronRight />}</div>
                  {showCharts && <Row>
                    <Col lg={6} className="mb-4"><Card className="h-100"><Card.Body>
                      <h6 className="text-center mb-3">Top 10 Banks by Net Payable</h6>
                      <Bar data={topBanksChart} options={{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:v=>'NPR '+v.toLocaleString()}}}}} /></Card.Body></Card></Col>
                    <Col lg={3} className="mb-4"><Card className="h-100"><Card.Body>
                      <h6 className="text-center mb-3">By Lot (Amount)</h6>
                      <Pie data={lotDistChart} options={{responsive:true,plugins:{legend:{position:'bottom'}}}} /></Card.Body></Card></Col>
                    <Col lg={3} className="mb-4"><Card className="h-100"><Card.Body>
                      <h6 className="text-center mb-3">By Status</h6>
                      <Doughnut data={statusChart} options={{responsive:true,plugins:{legend:{position:'bottom'}}}} /></Card.Body></Card></Col>
                    <Col lg={6}><Card><Card.Body>
                      <h6 className="text-center mb-3">Units Distribution</h6>
                      <Bar data={unitsHist} options={{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}} /></Card.Body></Card></Col>
                  </Row>}</Card.Body></Card>
              </>)}
            </Tab>

            {/* Web Sites Tab */}
            <Tab eventKey="websites" title={<span><FaGlobe className="me-1" />Web Sites</span>}>
              <Card className="shadow-sm mt-3"><Card.Body>
                <h5 className="mb-4"><FaGlobe className="me-2 text-primary" />Debenture Issuer Company Websites</h5>
                <p className="text-muted mb-4">Click on any company to visit their official website for more information about their debentures, financial reports, and investor relations.</p>
                <Row className="g-3">
                  {websites.map((w, i) => (
                    <Col xs={12} md={6} lg={4} key={i}>
                      <Card className="website-card h-100">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <Badge bg={w.has_data ? 'success' : 'secondary'} className="me-2">
                                {w.has_data ? <><FaCheckCircle /> Has Data</> : <><FaExclamationTriangle /> No Data</>}
                              </Badge>
                              <Badge bg="outline-dark" className="border">{w.type}</Badge>
                            </div>
                          </div>
                          <h6 className="mb-1 mt-2"><FaBuilding className="me-1" /> {w.name}</h6>
                          <small className="text-muted">Code: {w.code}</small>
                          <div className="mt-2">
                            {w.website && w.website !== '#' ? (
                              <Button variant="outline-primary" size="sm" href={w.website} target="_blank" rel="noopener noreferrer">
                                <FaGlobe className="me-1" /> Visit Website <FaExternalLinkAlt className="ms-1" />
                              </Button>
                            ) : (
                              <Badge bg="light" text="muted">No website available</Badge>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card.Body></Card>
            </Tab>
          </Tabs>

          {/* Column Modal */}
          <Modal show={showColModal} onHide={()=>setShowColModal(false)} size="sm">
            <Modal.Header closeButton><Modal.Title><FaColumns className="me-2" />Columns</Modal.Title></Modal.Header>
            <Modal.Body>{ALL_COLUMNS.map(c=><Form.Check key={c.key} type="switch" id={`c-${c.key}`} label={c.label}
              checked={visibleCols.includes(c.key)} disabled={c.key==='sn'} onChange={()=>toggleCol(c.key)} className="mb-2" />)}</Modal.Body>
          </Modal>

          {/* Detail Modal */}
          <Modal show={showDetail} onHide={()=>setShowDetail(false)} size="lg" centered>
            <Modal.Header closeButton><Modal.Title>Applicant Details - {selRecord?.applicant_name}</Modal.Title></Modal.Header>
            <Modal.Body>{selRecord && <Row>
              <Col md={6}>{[['BOID',selRecord.boid],['Name',selRecord.applicant_name],
                ['Father/Mother',selRecord.father_mother_name],['Grandfather/Spouse',selRecord.grandfather_spouse_name],
                ['Citizenship',selRecord.citizenship_number],['Issued From',selRecord.issued_from]].map(([l,v])=>
                <React.Fragment key={l}><div className="detail-label">{l}</div><div className="detail-value">{v||'-'}</div></React.Fragment>)}</Col>
              <Col md={6}>{[['Units',selRecord.alloted_quantity],['Amount (NPR)',fmt(selRecord.amount)],
                ['Gross Interest',fmt(selRecord.period_interest)],['TDS',fmt(selRecord.tax)],
                ['Net Interest',fmt(selRecord.net_interest_payable)],
                ['Bank',`${selRecord.bank_name} (${selRecord.bank_code})`],
                ['Account',selRecord.account_number],['Lot',selRecord.lot],
                ['Status',selRecord.status],['Approved Date',fmtDate(selRecord.approved_date)],
                ['Net Payable',`NPR ${fmt(selRecord.roundup)}`],['Remarks',selRecord.remarks]].map(([l,v])=>
                <React.Fragment key={l}><div className="detail-label">{l}</div>
                {l==='Status'?<div className="detail-value"><Badge bg={statusVar(v)}>{v}</Badge></div>:
                <div className="detail-value">{v||'-'}</div>}</React.Fragment>)}</Col>
            </Row>}</Modal.Body>
            <Modal.Footer><Button onClick={()=>setShowDetail(false)}>Close</Button></Modal.Footer>
          </Modal>
        </Container></div>
    </>
  );
};

export default InterestReconciliation;