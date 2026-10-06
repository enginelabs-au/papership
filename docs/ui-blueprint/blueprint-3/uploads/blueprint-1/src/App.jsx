import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import CcOrgDash from './pages/cc-org-dash';
import Dashboard_new from './pages/Dashboard_new';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cc-org-dash" replace />} />
        <Route path="/EcoOS" element={<Navigate to="/cc-org-dash" replace />} />
        <Route path="/ecoos" element={<Navigate to="/cc-org-dash" replace />} />
        <Route path="/cc-org-dash" element={<CcOrgDash />} />
        <Route path="/Dashboard_new" element={<Dashboard_new />} />
        <Route path="/Dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
