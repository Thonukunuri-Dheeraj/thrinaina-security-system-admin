import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, logout } from '../services/api';
import logoImg from '../assets/logo.jpg';
import { 
  Shield, 
  Calendar, 
  Wrench, 
  Users, 
  TrendingUp, 
  Search, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  LogOut, 
  User, 
  Trash2,
  X,
  Menu
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview', 'bookings', 'requests', 'customers', 'messages'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Mobile Sidebar Toggle
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Data States
  const [stats, setStats] = useState(null);
  const [chartsData, setChartsData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Interactive Graph State
  const [selectedMonth, setSelectedMonth] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [breakdownTab, setBreakdownTab] = useState('installations'); // 'installations' or 'services'

  // Modal / Inline Edit States
  const [editingRequest, setEditingRequest] = useState(null); // { id, status, admin_notes }
  const [selectedClient, setSelectedClient] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, chartsRes, bookingsRes, requestsRes, customersRes] = await Promise.all([
        api.dashboard.getStats(),
        api.dashboard.getCharts(),
        api.bookings.getAll(),
        api.requests.getAll(),
        api.dashboard.getCustomers()
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (chartsRes.success) {
        setChartsData(chartsRes.charts);
        const trend = chartsRes.charts.monthlyTrend;
        if (trend && trend.length > 0) {
          setSelectedMonth(trend[trend.length - 1].month);
        }
      }
      if (bookingsRes.success) setBookings(bookingsRes.bookings);
      if (requestsRes.success) setRequests(requestsRes.requests);
      if (customersRes.success) setCustomers(customersRes.customers);

    } catch (err) {
      console.error('Fetch Dashboard Error:', err);
      setError(err.message || 'Failed to load dashboard data. Check database connections.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch dashboard data
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    window.location.reload();
  };

  // Status Modifiers
  const handleBookingStatusChange = async (id, status) => {
    try {
      const res = await api.bookings.updateStatus(id, status);
      if (res.success) {
        setBookings(prev => 
          prev.map(b => b.id === parseInt(id) ? { ...b, status } : b)
        );
        const statsRes = await api.dashboard.getStats();
        if (statsRes.success) setStats(statsRes.stats);
      }
    } catch (err) {
      console.error('Failed to update booking status:', err);
    }
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      const res = await api.bookings.delete(id);
      if (res.success) {
        const targetBooking = bookings.find(b => b.id === parseInt(id));
        const customerId = targetBooking ? targetBooking.customer_id : null;

        setBookings(prev => prev.filter(b => b.id !== parseInt(id)));
        
        const statsRes = await api.dashboard.getStats();
        if (statsRes.success) setStats(statsRes.stats);
        
        if (customerId) {
          setCustomers(prev => 
            prev.map(c => c.id === customerId ? { ...c, bookings_count: Math.max(0, c.bookings_count - 1) } : c)
          );
        }
      }
    } catch (err) {
      console.error('Failed to delete booking:', err);
      alert(err.message || 'Failed to delete booking.');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer? This will also delete ALL their bookings and support tickets!')) return;
    try {
      const res = await api.dashboard.deleteCustomer(id);
      if (res.success) {
        setCustomers(prev => prev.filter(c => c.id !== parseInt(id)));
        setBookings(prev => prev.filter(b => b.customer_id !== parseInt(id)));
        setRequests(prev => prev.filter(r => r.customer_id !== parseInt(id)));

        const statsRes = await api.dashboard.getStats();
        if (statsRes.success) setStats(statsRes.stats);
      }
    } catch (err) {
      console.error('Failed to delete customer:', err);
      alert(err.message || 'Failed to delete customer.');
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service ticket?')) return;
    try {
      const res = await api.requests.delete(id);
      if (res.success) {
        setRequests(prev => prev.filter(r => r.id !== parseInt(id)));
        const statsRes = await api.dashboard.getStats();
        if (statsRes.success) setStats(statsRes.stats);
      }
    } catch (err) {
      console.error('Failed to delete service ticket:', err);
      alert(err.message || 'Failed to delete service ticket.');
    }
  };

  const handleRequestStatusChange = async (id, status, notes) => {
    try {
      const res = await api.requests.updateStatus(id, status, notes);
      if (res.success) {
        setRequests(prev => 
          prev.map(r => r.id === parseInt(id) ? { ...r, status, admin_notes: notes } : r)
        );
        setEditingRequest(null);
        const statsRes = await api.dashboard.getStats();
        if (statsRes.success) setStats(statsRes.stats);
      }
    } catch (err) {
      console.error('Failed to update request status:', err);
    }
  };

  // Helper date matching formatting for charts
  const getBookingMonthYear = (createdAtStr) => {
    if (!createdAtStr) return '';
    const d = new Date(createdAtStr);
    if (isNaN(d.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Specific status counts inside a month for selected month breakdown
  const getMonthDetailedCounts = (monthStr) => {
    const monthBookings = bookings.filter(b => getBookingMonthYear(b.created_at) === monthStr);
    const monthRequests = requests.filter(r => getBookingMonthYear(r.created_at) === monthStr);

    return {
      installations: {
        total: monthBookings.length,
        pending: monthBookings.filter(b => b.status === 'Pending').length,
        confirmed: monthBookings.filter(b => b.status === 'Confirmed' || b.status === 'Technician Assigned').length,
        inProgress: monthBookings.filter(b => b.status === 'In Progress').length,
        completed: monthBookings.filter(b => b.status === 'Completed' || b.status === 'Resolved').length,
        cancelled: monthBookings.filter(b => b.status === 'Cancelled' || b.status === 'Closed').length
      },
      services: {
        total: monthRequests.length,
        pending: monthRequests.filter(r => r.status === 'Pending').length,
        confirmed: monthRequests.filter(r => r.status === 'Confirmed' || r.status === 'Assigned' || r.status === 'Technician Assigned').length,
        inProgress: monthRequests.filter(r => r.status === 'In Progress' || r.status === 'Open').length,
        completed: monthRequests.filter(r => r.status === 'Completed' || r.status === 'Resolved').length,
        cancelled: monthRequests.filter(r => r.status === 'Cancelled' || r.status === 'Closed').length
      }
    };
  };

  // CSV Exporters
  const exportToCSV = (dataType) => {
    let headers = [];
    let rows = [];
    let filename = '';

    if (dataType === 'bookings') {
      headers = ['Booking ID', 'Customer Name', 'Mobile', 'Email', 'Service Type', 'Cameras', 'Preferred Date', 'Slot', 'Status', 'Registered Date'];
      rows = bookings.map(b => [
        b.booking_id,
        b.customer_name,
        b.customer_mobile,
        b.customer_email,
        b.service_type,
        b.cameras_count,
        b.preferred_date.split('T')[0],
        b.preferred_time,
        b.status,
        b.created_at.split('T')[0]
      ]);
      filename = 'CCTV_Bookings_Report.csv';
    } else if (dataType === 'requests') {
      headers = ['Request ID', 'Customer Name', 'Mobile', 'Type', 'Description', 'Status', 'Technician Notes', 'Registered Date'];
      rows = requests.map(r => [
        r.request_id,
        r.customer_name,
        r.customer_mobile,
        r.request_type,
        r.description.replace(/,/g, ';'),
        r.status,
        (r.admin_notes || '').replace(/,/g, ';'),
        r.created_at.split('T')[0]
      ]);
      filename = 'CCTV_Complaints_Report.csv';
    } else if (dataType === 'customers') {
      headers = ['Customer Name', 'Email', 'Mobile', 'Address', 'Total Bookings', 'Total Tickets', 'Registered Date'];
      rows = customers.map(c => [
        c.name,
        c.email,
        c.mobile,
        c.address.replace(/,/g, ';'),
        c.bookings_count,
        c.requests_count,
        c.created_at.split('T')[0]
      ]);
      filename = 'CCTV_Customers_List.csv';
    }

    if (rows.length === 0) {
      alert('No data available to export.');
      return;
    }

    const csvContent = 
      'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filters
  const getFilteredBookings = () => {
    return bookings.filter(b => {
      const matchSearch = 
        b.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customer_mobile.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'All' || b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  };

  const getFilteredRequests = () => {
    return requests.filter(r => {
      const matchSearch = 
        r.request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.customer_mobile.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  };

  const getFilteredCustomers = () => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Dynamic Greeting based on time
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Sidebar Menu Array
  const menuItems = [
    { id: 'overview', label: 'Analytics Panel', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'bookings', label: 'CCTV Bookings', icon: <Calendar className="w-5 h-5" /> },
    { id: 'requests', label: 'Service Tickets', icon: <Wrench className="w-5 h-5" /> },
    { id: 'customers', label: 'Client Accounts', icon: <Users className="w-5 h-5" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center relative select-none">
        <div className="absolute inset-0 bg-[#0B132B]/10 blur-[120px] rounded-full pointer-events-none" />
        <span className="w-12 h-12 border-[3px] border-security-gold border-t-transparent rounded-full animate-spin shadow-gold-glow" />
        <span className="text-xs font-bold text-slate-400 mt-6 tracking-[0.2em] uppercase animate-pulse">Establishing Secure Hub...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center px-4">
        <div className="max-w-md p-8 glass-panel border-red-500/30 text-center relative">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-4">Database Connection Failed</h2>
          <p className="text-xs text-security-textGray mt-3 leading-relaxed">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-6 w-full py-3.5 bg-security-gold hover:bg-security-goldHover text-security-bg font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-gold-glow cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-security-bg text-slate-100 flex relative overflow-hidden font-sans select-none">
      <div className="cctv-bg" aria-hidden="true" />
      
      {/* 1. Left Sidebar Navigation - Desktop */}
      <aside className="w-64 bg-[#070e1b]/85 border-r border-slate-900/70 flex flex-col justify-between shrink-0 z-30 relative hidden md:flex">
        <div className="space-y-8 pt-6">
          {/* Brand Logo Header */}
          <div className="px-6 flex items-center gap-3">
            <img
              src={logoImg}
              alt="Thrinaina Logo"
              className="w-9 h-9 object-contain rounded-xl border border-security-gold/20 bg-white p-0.5 shrink-0"
            />
            <div>
              <span className="font-extrabold text-sm tracking-widest text-slate-100 block">THRINAINA</span>
              <span className="text-[9px] font-bold text-slate-500 tracking-[0.2em] uppercase">SYSTEM CONTROL</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSubTab(item.id);
                  setSearchTerm('');
                  setStatusFilter('All');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
                  activeSubTab === item.id
                    ? 'bg-security-gold text-security-bg shadow-gold-glow font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* 2. Mobile Sidebar Navigation Drawer */}
      <div 
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileSidebarOpen(false)}
      >
        <aside 
          className={`w-64 h-full bg-[#050a16] border-r border-slate-900/80 flex flex-col justify-between p-4 transition-transform duration-300 ease-out transform ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-6 pt-4">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-3">
                <img
                  src={logoImg}
                  alt="Thrinaina Logo"
                  className="w-8 h-8 object-contain rounded-lg border border-security-gold/20 bg-white p-0.5 shrink-0"
                />
                <div>
                  <span className="font-extrabold text-xs tracking-wider text-slate-100">THRINAINA</span>
                  <span className="text-[8px] font-bold text-slate-500 block uppercase">CONTROL HUB</span>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1 rounded-lg text-slate-450 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSubTab(item.id);
                    setSearchTerm('');
                    setStatusFilter('All');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    activeSubTab === item.id
                      ? 'bg-security-gold text-security-bg shadow-gold-glow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

        </aside>
      </div>

      {/* 3. Main Content Container */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto bg-transparent relative z-10">
        
        {/* Main Content Area Top Header Bar */}
        <header className="border-b border-slate-900/60 bg-[#050a16]/40 backdrop-blur-md py-4 px-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger for mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 md:hidden hover:bg-slate-900/50 cursor-pointer"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            
            <div>
              <h2 className="text-slate-100 font-extrabold text-lg tracking-tight capitalize">
                {activeSubTab === 'overview' ? 'Dashboard Analytics' : `${activeSubTab} Management`}
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden sm:block mt-0.5">
                {getGreeting()}, administrator &bull; {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Sync Refresh Status */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-805 hover:border-security-gold text-slate-455 hover:text-security-gold transition-all duration-300 cursor-pointer relative group flex items-center justify-center"
              title="Synchronize Data"
            >
              <RefreshCw className={`w-4.5 h-4.5 ${refreshing ? 'animate-spin text-security-gold' : ''}`} />
            </button>

            {/* Admin Name */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-805">
              <div className="w-7 h-7 rounded-full bg-security-blue/20 border border-security-gold/30 flex items-center justify-center font-black text-security-gold text-xs shrink-0 select-none">
                G
              </div>
              <div>
                <span className="font-bold text-slate-200 text-[11px] block leading-tight">T.Ganesh Kumar</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider">System Admin</span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/60 text-red-400 hover:text-red-300 font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer"
              title="Log Out of System"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </header>

        {/* Dynamic Inner Tab Views wrapper */}
        <div className="p-6 space-y-6 flex-grow">
          
          {/* TAB A: OVERVIEW / DASHBOARD ANALYTICS */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Summary Cards Row */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  
                  {/* Bookings Card */}
                  <div className="glass-panel p-5 bg-[#050a16]/60 border-slate-900/60 hover:border-security-gold/30 hover:shadow-gold-glow transition-all duration-300 flex items-center justify-between group">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Bookings</span>
                      <span className="text-2xl font-black text-slate-100 tracking-tight block">{stats.bookings.total}</span>
                      <span className="text-[9px] text-amber-500 font-bold block flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        {stats.bookings.pending} Pending confirmations
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center group-hover:border-security-gold/20 transition-colors duration-300">
                      <Calendar className="w-5 h-5 text-security-gold" />
                    </div>
                  </div>

                  {/* Service Bookings Card */}
                  <div className="glass-panel p-5 bg-[#050a16]/60 border-slate-900/60 hover:border-security-gold/30 hover:shadow-gold-glow transition-all duration-300 flex items-center justify-between group">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Service Bookings</span>
                      <span className="text-2xl font-black text-slate-100 tracking-tight block">{stats.requests.total}</span>
                      <span className="text-[9px] text-red-405 font-bold block flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {stats.requests.open} Pending service tickets
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center group-hover:border-security-gold/20 transition-colors duration-300">
                      <Wrench className="w-5 h-5 text-security-gold" />
                    </div>
                  </div>

                  {/* Customer Accounts Card */}
                  <div className="glass-panel p-5 bg-[#050a16]/60 border-slate-900/60 hover:border-security-gold/30 hover:shadow-gold-glow transition-all duration-300 flex items-center justify-between group">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Clients</span>
                      <span className="text-2xl font-black text-slate-100 tracking-tight block">{stats.totalCustomers}</span>
                      <span className="text-[9px] text-emerald-450 font-bold block flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 shrink-0" />
                        Synchronized DB
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center group-hover:border-security-gold/20 transition-colors duration-300">
                      <Users className="w-5 h-5 text-security-gold" />
                    </div>
                  </div>
                </div>
              )}

              {/* Charts grid */}
              {chartsData && chartsData.monthlyTrend && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Graph card - left 2 columns */}
                  <div className="glass-panel p-5 sm:p-6 bg-security-card/50 border-slate-900/60 lg:col-span-2 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                          <TrendingUp className="w-4.5 h-4.5 text-security-gold" />
                          Bookings Volume Trend
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Click month nodes on the graph to display breakdown details</p>
                      </div>

                       {/* Month Selector Dropdown */}
                       <div className="relative inline-block select-none">
                         <select
                           value={selectedMonth}
                           onChange={(e) => setSelectedMonth(e.target.value)}
                           className="appearance-none bg-[#030712] border border-slate-850 hover:border-security-gold/50 text-slate-200 text-[10px] font-bold uppercase tracking-wider pl-3.5 pr-8 py-1.5 rounded-lg cursor-pointer transition-all duration-300 focus:outline-none focus:border-security-gold/70 focus:ring-1 focus:ring-security-gold/20 shadow-sm"
                         >
                           {chartsData.monthlyTrend.map(t => (
                             <option key={t.month} value={t.month} className="bg-[#030712] text-slate-300 py-1 font-bold">
                               {t.month}
                             </option>
                           ))}
                         </select>
                         {/* Dropdown Chevron Indicator */}
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-security-gold">
                           <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                             <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                           </svg>
                         </div>
                       </div>
                    </div>

                    {/* Smooth Bezier Area SVG Chart */}
                    <div className="relative pt-4 pr-2 select-none">
                      {(() => {
                        const trend = chartsData.monthlyTrend;
                        if (trend.length === 0) return (
                          <div className="h-72 flex items-center justify-center text-slate-500 italic text-xs">No trend data available.</div>
                        );

                        const maxVal = Math.max(...trend.map(t => t.count), 5);
                        const width = 500;
                        const height = 260; // Increased viewBox height to give buffer room
                        const paddingX = 45;
                        const paddingTop = 20;
                        const paddingBottom = 45; // Increased bottom padding to accommodate labels

                        // Calculate points coordinates
                        const points = trend.map((t, idx) => {
                          const x = trend.length > 1
                            ? paddingX + (idx / (trend.length - 1)) * (width - 2 * paddingX)
                            : paddingX + 0.5 * (width - 2 * paddingX);
                          const y = height - paddingBottom - (t.count / maxVal) * (height - paddingTop - paddingBottom);
                          return { x, y, month: t.month, count: t.count };
                        });

                        // Make straight line path (point-to-point connections)
                        let pathD = '';
                        if (points.length > 0) {
                          pathD = `M ${points[0].x} ${points[0].y}`;
                          for (let i = 1; i < points.length; i++) {
                            pathD += ` L ${points[i].x} ${points[i].y}`;
                          }
                        }

                        return (
                          <div className="relative h-72 pb-6 w-full">
                            <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                              <defs>
                                {/* Arrowhead marker definition */}
                                <marker
                                  id="chartArrow"
                                  viewBox="0 0 10 10"
                                  refX="6"
                                  refY="5"
                                  markerWidth="6"
                                  markerHeight="6"
                                  orient="auto-start-reverse"
                                >
                                  <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#475569" />
                                </marker>

                                {/* Web-matching Blue gradient for precision line stroke */}
                                <linearGradient id="lineGlowGrad" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#93c5fd" />
                                  <stop offset="50%" stopColor="#4A90E2" />
                                  <stop offset="100%" stopColor="#1e40af" />
                                </linearGradient>

                                {/* SVG gaussian blur glow filter */}
                                <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                                  <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                  </feMerge>
                                </filter>
                              </defs>

                              {/* Y-Axis Grid Lines (Horizontal) */}
                              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                                const y = paddingTop + ratio * (height - paddingTop - paddingBottom);
                                const gridVal = Math.round(maxVal * (1 - ratio));
                                return (
                                  <g key={`h-grid-${idx}`}>
                                    <line x1={paddingX} y1={y} x2={width - paddingX + 5} y2={y} stroke="#1e293b" strokeWidth="0.8" className="opacity-60" />
                                    <text x={paddingX - 10} y={y + 2.5} textAnchor="end" fill="#94a3b8" fontSize="7" fontWeight="bold" fontFamily="monospace">
                                      {gridVal}
                                    </text>
                                  </g>
                                );
                              })}

                              {/* X-Axis Grid Lines (Vertical, aligned with month coordinates) */}
                              {points.map((p, idx) => (
                                <line
                                  key={`v-grid-${idx}`}
                                  x1={p.x}
                                  y1={paddingTop - 5}
                                  x2={p.x}
                                  y2={height - paddingBottom}
                                  stroke="#1e293b"
                                  strokeWidth="0.8"
                                  className="opacity-60"
                                />
                              ))}

                              {/* Left Y-Axis with Arrowhead */}
                              <line 
                                x1={paddingX} 
                                y1={height - paddingBottom} 
                                x2={paddingX} 
                                y2={paddingTop - 14} 
                                stroke="#475569" 
                                strokeWidth="1.8" 
                                markerEnd="url(#chartArrow)" 
                              />

                              {/* Bottom X-Axis with Arrowhead */}
                              <line 
                                x1={paddingX} 
                                y1={height - paddingBottom} 
                                x2={width - paddingX + 18} 
                                y2={height - paddingBottom} 
                                stroke="#475569" 
                                strokeWidth="1.8" 
                                markerEnd="url(#chartArrow)" 
                              />

                              {/* X-Axis Month labels (Rotated and properly aligned to prevent clipping) */}
                              {points.map((p, idx) => (
                                <text
                                  key={`x-label-${idx}`}
                                  x={p.x}
                                  y={height - 20}
                                  textAnchor="end"
                                  transform={`rotate(-35, ${p.x}, ${height - 20})`}
                                  dx="-2"
                                  dy="2"
                                  fill="#64748b"
                                  fontSize="7"
                                  fontWeight="bold"
                                >
                                  {p.month.split(' ')[0]}
                                </text>
                              ))}

                              {/* Soft Blurred Glow Layer behind the main trace */}
                              <path d={pathD} fill="none" stroke="url(#lineGlowGrad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" filter="url(#glowFilter)" />

                              {/* Sharp Main Trace Line on top */}
                              <path d={pathD} fill="none" stroke="url(#lineGlowGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                              {/* Interactive hollow circle dots (white center fill, thick golden borders) */}
                              {points.map((p, idx) => {
                                const isSelected = selectedMonth === p.month;
                                const isHovered = hoveredPoint && hoveredPoint.month === p.month;
                                const isActive = isSelected || isHovered;

                                return (
                                  <g 
                                    key={idx} 
                                    onClick={() => setSelectedMonth(p.month)}
                                    onMouseEnter={() => setHoveredPoint({ x: p.x, y: p.y, count: p.count, month: p.month })}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                    className="cursor-pointer group/dot"
                                  >
                                    {/* Animated halo for active nodes */}
                                    {isActive && (
                                      <circle
                                        cx={p.x}
                                        cy={p.y}
                                        r={12}
                                        fill="none"
                                        stroke="#4A90E2"
                                        strokeWidth="1.5"
                                        className="opacity-35 animate-ping pointer-events-none"
                                      />
                                    )}
                                    {/* Hollow dot circle (White background/fill, thick blue stroke) */}
                                    <circle
                                      cx={p.x}
                                      cy={p.y}
                                      r={isSelected ? 6.5 : 4.5}
                                      fill="#ffffff"
                                      stroke={isSelected ? '#ffffff' : '#4A90E2'}
                                      strokeWidth={isSelected ? 3.5 : 2.5}
                                      className="transition-all duration-250 group-hover/dot:scale-115"
                                      style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                                    />
                                    {/* Inner indicator core on selection */}
                                    {isSelected && (
                                      <circle 
                                        cx={p.x} 
                                        cy={p.y} 
                                        r={2.5} 
                                        fill="#4A90E2" 
                                        className="pointer-events-none"
                                      />
                                    )}
                                  </g>
                                );
                              })}
                            </svg>

                            {/* Floating Tooltip Indicator */}
                            {hoveredPoint && (
                              <div 
                                className="absolute bg-[#070c19]/90 backdrop-blur-md border border-security-gold/50 rounded-xl px-3 py-2 text-left pointer-events-none shadow-[0_0_20px_rgba(74,144,226,0.25)] animate-fade-in text-[10px] z-50 flex flex-col gap-1"
                                style={{ 
                                  left: `${(hoveredPoint.x / width) * 100}%`, 
                                  top: `${(hoveredPoint.y / height) * 100 - 24}%`,
                                  transform: 'translate(-50%, -100%)',
                                  transition: 'left 0.15s ease-out, top 0.15s ease-out'
                                }}
                              >
                                <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-security-gold animate-pulse"></span>
                                  <span className="text-slate-300 font-bold uppercase tracking-wider text-[8px]">{hoveredPoint.month}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-slate-400 font-medium">Bookings Volume</span>
                                  <span className="text-security-gold font-black text-sm tracking-tight">{hoveredPoint.count} <span className="text-[9px] font-bold text-slate-500 uppercase">orders</span></span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Selected Month Detail Breakdown Panel - right 1 column */}
                  <div className="glass-panel p-5 sm:p-6 bg-security-card/50 border-slate-900/60 flex flex-col justify-between">
                    <div>
                      <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
                          Month breakdown
                        </h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-security-gold/10 border border-security-gold/20 text-security-gold uppercase">
                          {selectedMonth || 'Select Month'}
                        </span>
                      </div>

                      {/* Display breakdown parameters */}
                      {selectedMonth ? (
                        (() => {
                          const detailed = getMonthDetailedCounts(selectedMonth);

                          const renderSection = (title, data, isService) => {
                            const statuses = [
                              { label: isService ? 'Resolved' : 'Completed', val: data.completed, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
                              { label: isService ? 'Assigned' : 'Confirmed', val: data.confirmed, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                              { label: 'In Progress', val: data.inProgress, color: 'text-orange-455 bg-orange-500/10 border-orange-500/20' },
                              { label: 'Pending', val: data.pending, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                              { label: 'Cancelled', val: data.cancelled, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                            ];

                            return (
                              <div className="space-y-2.5 bg-[#050a16]/40 p-4 border border-slate-900/60 rounded-xl">
                                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                                  <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">{title}</span>
                                  <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-security-gold/15 text-security-gold border border-security-gold/30">
                                    {data.total} Total
                                  </span>
                                </div>
                                <div className="space-y-1.5 text-[11px]">
                                  {statuses.map((st, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-[#030712]/30 px-2.5 py-1.5 rounded-lg border border-slate-900/40">
                                      <span className="font-semibold text-slate-500">{st.label}</span>
                                      <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] border ${st.color}`}>
                                        {st.val}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          };

                          return (
                            <div className="space-y-4 pt-4 flex-grow overflow-y-auto max-h-[380px] pr-1">
                              {/* Switching Tabs capsule */}
                              <div className="flex p-0.5 bg-[#030712] border border-slate-900/60 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => setBreakdownTab('installations')}
                                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                    breakdownTab === 'installations'
                                      ? 'bg-security-gold text-security-bg shadow-gold-glow'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Installations
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setBreakdownTab('services')}
                                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                    breakdownTab === 'services'
                                      ? 'bg-security-gold text-security-bg shadow-gold-glow'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Services
                                </button>
                              </div>

                              {/* Selected Section */}
                              {breakdownTab === 'installations' ? (
                                renderSection('Installation Bookings', detailed.installations, false)
                              ) : (
                                renderSection('Service Bookings', detailed.services, true)
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex items-center justify-center flex-grow py-12 text-slate-500 italic text-xs">
                          Select a month on the graph to display breakdown metrics.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* Service Types & Requests charts */}
              {chartsData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Category share bar chart */}
                  <div className="glass-panel p-5 sm:p-6 bg-security-card/50 border-slate-900/60 space-y-5">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2 border-b border-slate-900 pb-3">
                      <Shield className="w-4.5 h-4.5 text-security-gold" />
                      Bookings by Installation Service Category
                    </h3>

                    <div className="space-y-4">
                      {chartsData.bookingsByService.length === 0 ? (
                        <p className="text-slate-500 text-xs italic text-center py-6">No data registered.</p>
                      ) : (
                        chartsData.bookingsByService.slice(0, 5).map((item, idx) => {
                          const maxCount = Math.max(...chartsData.bookingsByService.map(e => e.count));
                          const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                          return (
                            <div key={idx} className="space-y-2">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-400">{item.service_type}</span>
                                <span className="text-security-gold font-bold">{item.count} Bookings</span>
                              </div>
                              <div className="h-2 w-full bg-[#030712] rounded-full overflow-hidden border border-slate-900/40">
                                <div 
                                  className="h-full bg-gradient-to-r from-security-gold to-security-gold/70 rounded-full transition-all duration-1000 shadow-gold-glow"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Support tickets shares */}
                  <div className="glass-panel p-5 sm:p-6 bg-security-card/50 border-slate-900/60 space-y-5">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2 border-b border-slate-900 pb-3">
                      <Wrench className="w-4.5 h-4.5 text-security-gold" />
                      Support Request Tickets by Topic
                    </h3>

                    <div className="space-y-4">
                      {chartsData.requestsByType.length === 0 ? (
                        <p className="text-slate-550 text-xs italic text-center py-6">No active support requests.</p>
                      ) : (
                        chartsData.requestsByType.map((item, idx) => {
                          const maxCount = Math.max(...chartsData.requestsByType.map(e => e.count));
                          const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                          return (
                            <div key={idx} className="space-y-2">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-400">{item.request_type}</span>
                                <span className="text-security-gold font-bold">{item.count} Tickets</span>
                              </div>
                              <div className="h-2 w-full bg-[#030712] rounded-full overflow-hidden border border-slate-900/40">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB B: OTHER SECTIONS SEARCH, FILTER, AND TABLE VIEWS */}
          {activeSubTab !== 'overview' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Search & Actions Control Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#050a16]/40 p-4 border border-slate-900/60 rounded-xl">
                {/* Search query input */}
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-505" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Search ${activeSubTab}...`}
                    className="w-full bg-[#030712] border border-slate-850 focus:border-security-gold text-xs text-slate-300 rounded-xl pl-10 pr-4 py-3 focus:outline-none transition-colors"
                  />
                </div>

                {/* Dropdown filter selector & csv exporter */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {(activeSubTab === 'bookings' || activeSubTab === 'requests') && (
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-[#030712] border border-slate-855 text-xs text-slate-350 rounded-xl px-3.5 py-3 focus:outline-none focus:border-security-gold cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      {activeSubTab === 'bookings' ? (
                        <>
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </>
                      ) : (
                        <>
                          <option value="Pending">In Progress</option>
                          <option value="Assigned">Assigned</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Cancelled">Cancelled</option>
                        </>
                      )}
                    </select>
                  )}

                  {activeSubTab !== 'messages' && (
                    <button
                      onClick={() => exportToCSV(activeSubTab)}
                      className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-850 hover:border-security-gold text-slate-300 hover:text-security-gold font-bold text-xs uppercase rounded-xl transition-all cursor-pointer hover:shadow-gold-glow"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="glass-panel border-slate-900/60 overflow-hidden bg-security-card/40">
                
                {/* 1. CCTV INSTALLATION BOOKINGS LIST */}
                {activeSubTab === 'bookings' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/70 border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-4.5 px-5">Booking Details</th>
                          <th className="py-4.5 px-5">Customer Profile</th>
                          <th className="py-4.5 px-5">Service Specifications</th>
                          <th className="py-4.5 px-5">Preferred Slot</th>
                          <th className="py-4.5 px-5 text-center">Status Action</th>
                          <th className="py-4.5 px-5 text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50 text-slate-300">
                        {getFilteredBookings().length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-12 text-center text-slate-505 font-bold uppercase tracking-wider animate-pulse">
                              No bookings matching search scope.
                            </td>
                          </tr>
                        ) : (
                          getFilteredBookings().map(b => (
                            <tr key={b.id} className="hover:bg-slate-900/20 transition-all duration-200">
                              <td className="py-4 px-5">
                                <span className="font-mono font-bold text-slate-100 tracking-wider text-sm block">{b.track_id || b.booking_id}</span>
                                <span className="text-[9.5px] text-slate-500 block mt-1">
                                  Placed: {new Date(b.created_at).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="py-4 px-5 space-y-1">
                                <span className="font-bold text-slate-100 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-security-gold shrink-0" />
                                  {b.customer_name}
                                </span>
                                <span className="text-slate-400 block font-mono">{b.customer_mobile}</span>
                                <span className="text-slate-500 block truncate max-w-xs">{b.customer_email}</span>
                                <span className="text-slate-500 block text-[10px] truncate max-w-xs">{b.address}</span>
                              </td>
                              <td className="py-4 px-5">
                                <span className="font-bold text-slate-205 block">{b.service_type}</span>
                                {b.service_type === 'CCTV Installation' && (
                                  <span className="text-[10px] text-security-gold font-bold block mt-1 font-mono">
                                    {b.cameras_count} Camera Units
                                  </span>
                                )}
                                {b.additional_requirements && (
                                  <span className="text-[10px] text-slate-500 block italic max-w-xs mt-1 truncate" title={b.additional_requirements}>
                                    Notes: {b.additional_requirements}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-5 space-y-1">
                                <span className="font-bold text-slate-200 block font-mono">
                                  {new Date(b.preferred_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                                <span className="text-slate-500 text-[10px] block font-mono">{b.preferred_time}</span>
                              </td>
                              <td className="py-4 px-5 text-center">
                                <select
                                  value={b.status}
                                  onChange={(e) => handleBookingStatusChange(b.id, e.target.value)}
                                  className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase border focus:outline-none cursor-pointer tracking-wider ${
                                    b.status === 'Completed' || b.status === 'Completed'
                                      ? 'bg-green-500/10 border-green-500/35 text-green-400'
                                      : b.status === 'Pending'
                                      ? 'bg-amber-500/10 border-amber-500/35 text-amber-400'
                                      : b.status === 'Confirmed' || b.status === 'Technician Assigned'
                                      ? 'bg-blue-500/10 border-blue-500/35 text-blue-400'
                                      : b.status === 'In Progress'
                                      ? 'bg-orange-500/10 border-orange-500/35 text-orange-450'
                                      : 'bg-red-500/10 border-red-500/35 text-red-400'
                                  }`}
                                >
                                  <option value="Pending" className="bg-security-card text-slate-350">Pending</option>
                                  <option value="Confirmed" className="bg-security-card text-slate-355">Confirmed</option>
                                  <option value="In Progress" className="bg-security-card text-slate-355">In Progress</option>
                                  <option value="Completed" className="bg-security-card text-slate-355">Completed</option>
                                  <option value="Cancelled" className="bg-security-card text-slate-355">Cancelled</option>
                                </select>
                              </td>
                              <td className="py-4 px-5 text-center">
                                <button
                                  onClick={() => handleDeleteBooking(b.id)}
                                  className="p-2 text-slate-405 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                  title="Delete Booking"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 2. COMPLAINT & SERVICE REQUEST TICKETS LIST */}
                {activeSubTab === 'requests' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/70 border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-4.5 px-5">Ticket ID</th>
                          <th className="py-4.5 px-5">Client Profile</th>
                          <th className="py-4.5 px-5">Issue Specification</th>
                          <th className="py-4.5 px-5">Technician Action Notes</th>
                          <th className="py-4.5 px-5 text-center">Status Action</th>
                          <th className="py-4.5 px-5 text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50 text-slate-300">
                        {getFilteredRequests().length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-12 text-center text-slate-500 font-bold uppercase tracking-wider animate-pulse">
                              No service tickets matching search scope.
                            </td>
                          </tr>
                        ) : (
                          getFilteredRequests().map(r => (
                            <tr key={r.id} className="hover:bg-slate-900/20 transition-all duration-200">
                              <td className="py-4 px-5">
                                <span className="font-mono font-bold text-slate-100 tracking-wider text-sm block">{r.track_id || r.request_id}</span>
                                <span className="text-[9.5px] text-slate-500 block mt-1">
                                  Registered: {new Date(r.created_at).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="py-4 px-5 space-y-1">
                                <span className="font-bold text-slate-100 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-security-gold shrink-0" />
                                  {r.customer_name}
                                </span>
                                <span className="text-slate-400 block font-mono">{r.customer_mobile}</span>
                                <span className="text-slate-500 block truncate max-w-xs">{r.customer_address}</span>
                              </td>
                              <td className="py-4 px-5">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border inline-block mb-1.5 ${
                                  r.request_type === 'Complaint' 
                                    ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                                    : r.request_type === 'Maintenance' 
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                                    : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                }`}>
                                  {r.request_type}
                                </span>
                                <p className="text-slate-300 font-semibold leading-relaxed max-w-sm">
                                  {r.description}
                                </p>
                              </td>
                              <td className="py-4 px-5">
                                {r.admin_notes ? (
                                  <p className="bg-security-gold/5 border border-security-gold/15 text-security-gold/90 rounded-xl p-3 max-w-xs text-[11px] leading-relaxed font-semibold">
                                    {r.admin_notes}
                                  </p>
                                ) : (
                                  <span className="text-slate-500 italic text-[11px]">No notes attached. Click Manage to add dispatch notes.</span>
                                )}
                              </td>
                              <td className="py-4 px-5 text-center">
                                <button
                                  onClick={() => setEditingRequest({ id: r.id, status: r.status, admin_notes: r.admin_notes || '' })}
                                  className={`px-3.5 py-2 rounded-xl font-bold text-[10px] uppercase border hover:border-security-gold hover:shadow-gold-glow transition-all duration-200 cursor-pointer ${
                                    r.status === 'Resolved' || r.status === 'Completed'
                                      ? 'bg-green-500/10 border-green-500/35 text-green-455'
                                      : r.status === 'Pending' || r.status === 'Open' || r.status === 'In Progress'
                                      ? 'bg-orange-500/10 border-orange-500/35 text-orange-455'
                                      : r.status === 'Confirmed' || r.status === 'Assigned' || r.status === 'Technician Assigned'
                                      ? 'bg-blue-500/10 border-blue-500/35 text-blue-455'
                                      : 'bg-red-500/10 border-red-500/35 text-red-405'
                                  }`}
                                >
                                  Manage ({r.status})
                                </button>
                              </td>
                              <td className="py-4 px-5 text-center">
                                <button
                                  onClick={() => handleDeleteRequest(r.id)}
                                  className="p-2 text-slate-405 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                  title="Delete Service Ticket"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3. CLIENT ACCOUNTS LIST */}
                {activeSubTab === 'customers' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/70 border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-4.5 px-5">Client Profile</th>
                          <th className="py-4.5 px-5">Mobile Contact</th>
                          <th className="py-4.5 px-5">Email Address</th>
                          <th className="py-4.5 px-5">Stored Site Address</th>
                          <th className="py-4.5 px-5 text-center">Total Bookings</th>
                          <th className="py-4.5 px-5 text-center">Active Complaints</th>
                          <th className="py-4.5 px-5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50 text-slate-300">
                        {getFilteredCustomers().length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-12 text-center text-slate-500 font-bold uppercase tracking-wider animate-pulse">
                              No clients found in current query.
                            </td>
                          </tr>
                        ) : (
                          getFilteredCustomers().map(c => (
                            <tr key={c.id} className="hover:bg-slate-900/20 transition-all duration-200">
                              <td className="py-4 px-5 font-bold text-slate-100 flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-security-blue/20 border border-security-gold/25 flex items-center justify-center font-black text-security-gold text-xs shrink-0 select-none">
                                  {c.name.split(' ').map(n => n[0]).join('') || 'C'}
                                </div>
                                <span>{c.name}</span>
                              </td>
                              <td className="py-4 px-5 font-mono font-bold text-slate-200">{c.mobile}</td>
                              <td className="py-4 px-5 font-mono text-slate-400">{c.email}</td>
                              <td className="py-4 px-5 max-w-xs leading-relaxed truncate text-slate-450">{c.address}</td>
                              <td className="py-4 px-5 text-center font-extrabold text-security-gold text-sm font-mono">{c.bookings_count}</td>
                              <td className="py-4 px-5 text-center font-extrabold text-red-400 text-sm font-mono">{c.requests_count}</td>
                              <td className="py-4 px-5 text-center flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setSelectedClient(c)}
                                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-805 hover:border-security-gold text-slate-300 hover:text-security-gold font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer hover:shadow-gold-glow"
                                >
                                  View Bookings
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomer(c.id)}
                                  className="p-2.5 text-slate-405 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                  title="Delete Client Profile"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}



              </div>
            </div>
          )}

        </div>
      </main>

      {/* 4. Support Ticket Status Editor Modal Dialog */}
      {editingRequest && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 bg-[#050a16]/95 border-security-gold/30 shadow-gold-glow max-w-md w-full space-y-6 relative animate-fade-in-up">
            
            <button 
              onClick={() => setEditingRequest(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-900 pb-3 flex flex-col gap-1">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-100">
                Update Service Ticket Status
              </h3>
              <span className="text-[10px] font-mono text-security-gold">Ticket ID: {editingRequest.id}</span>
            </div>

            {/* Status Option list */}
            <div className="space-y-2">
              <label htmlFor="modal_status" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Update Status
              </label>
              <select
                id="modal_status"
                value={editingRequest.status}
                onChange={(e) => setEditingRequest(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-[#030712] border border-slate-800 focus:border-security-gold text-sm text-slate-200 rounded-xl px-4 py-3.5 focus:outline-none cursor-pointer"
              >
                <option value="Pending" className="bg-security-card">In Progress</option>
                <option value="Assigned" className="bg-security-card">Assigned (Technician Dispatched)</option>
                <option value="Resolved" className="bg-security-card">Resolved</option>
                <option value="Closed" className="bg-security-card">Cancelled</option>
              </select>
            </div>

            {/* Admin dispatcher notes */}
            <div className="space-y-2">
              <label htmlFor="modal_notes" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Technician Dispatch Notes
              </label>
              <textarea
                id="modal_notes"
                rows="4"
                value={editingRequest.admin_notes}
                onChange={(e) => setEditingRequest(prev => ({ ...prev, admin_notes: e.target.value }))}
                placeholder="Attach technician assignment info or resolution details (e.g. Dispatched technician Rajesh K. CCTV camera wiring repaired & DVR Adapter replaced)."
                className="w-full bg-[#030712] border border-slate-800 focus:border-security-gold text-xs text-slate-250 rounded-xl px-4 py-3.5 focus:outline-none resize-none font-medium leading-relaxed"
              />
            </div>

            {/* Control buttons */}
            <div className="flex gap-3 pt-3">
              <button
                onClick={() => setEditingRequest(null)}
                className="flex-1 py-3.5 bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 rounded-xl hover:text-slate-200 hover:bg-slate-850 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRequestStatusChange(editingRequest.id, editingRequest.status, editingRequest.admin_notes)}
                className="flex-1 py-3.5 bg-security-gold hover:bg-security-goldHover text-security-bg text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer shadow-gold/20"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Client Bookings Modal Popover */}
      {selectedClient && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 bg-[#050a16]/95 border-security-gold/30 shadow-gold-glow max-w-2xl w-full space-y-5 relative animate-fade-in-up">
            
            <button 
              onClick={() => setSelectedClient(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-900 text-slate-450 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-900 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-security-gold" />
                Client Account File & Bookings
              </h3>
            </div>

            {/* Profile specifications grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#030712]/50 border border-slate-900/60 rounded-xl p-4 text-xs font-medium">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Customer Name</span>
                <span className="font-bold text-slate-200 text-sm">{selectedClient.name}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Mobile Contact</span>
                <span className="font-bold text-slate-200 font-mono text-sm">{selectedClient.mobile}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Email Address</span>
                <span className="font-bold text-slate-200 font-mono text-sm">{selectedClient.email}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Service Address</span>
                <span className="font-bold text-slate-200 leading-relaxed block">{selectedClient.address}</span>
              </div>
            </div>

            {/* Interactive bookings history lists */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Installation bookings ledger ({bookings.filter(b => b.customer_id === selectedClient.id).length})
              </h4>
              
              <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
                {(() => {
                  const clientBookings = bookings.filter(b => b.customer_id === selectedClient.id);
                  if (clientBookings.length === 0) {
                    return (
                      <p className="text-xs text-slate-550 italic py-6 text-center font-bold uppercase tracking-wider">
                        No bookings associated with this profile.
                      </p>
                    );
                  }
                  return clientBookings.map(b => (
                    <div key={b.id} className="flex justify-between items-center bg-[#030712]/35 border border-slate-900/60 rounded-xl p-3.5 text-xs hover:border-slate-850 transition-colors">
                      <div className="space-y-1">
                        <span className="font-mono font-bold text-slate-100 tracking-wider text-xs block">{b.track_id || b.booking_id}</span>
                        <span className="text-slate-355 font-bold block text-[11px]">
                          {b.service_type} {b.cameras_count > 0 && `(${b.cameras_count} Camera Units)`}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-mono">
                          Slot: {new Date(b.preferred_date).toLocaleDateString()} &bull; {b.preferred_time}
                        </span>
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase border inline-block mt-1 ${
                          b.status === 'Completed'
                            ? 'bg-green-500/10 border-green-500/35 text-green-400'
                            : b.status === 'Pending'
                            ? 'bg-amber-500/10 border-amber-500/35 text-amber-400'
                            : b.status === 'Confirmed' || b.status === 'Technician Assigned'
                            ? 'bg-blue-500/10 border-blue-500/35 text-blue-400'
                            : b.status === 'In Progress'
                            ? 'bg-orange-500/10 border-orange-500/35 text-orange-450'
                            : 'bg-red-500/10 border-red-500/35 text-red-400'
                        }`}>
                          {b.status}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteBooking(b.id)}
                        className="p-2.5 text-slate-405 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete Booking"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Close button wrapper */}
            <div className="flex pt-3 border-t border-slate-900">
              <button
                onClick={() => setSelectedClient(null)}
                className="w-full py-3.5 bg-slate-900 border border-slate-805 hover:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-355 rounded-xl hover:bg-slate-850 hover:text-slate-200 transition-all cursor-pointer"
              >
                Close File
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
