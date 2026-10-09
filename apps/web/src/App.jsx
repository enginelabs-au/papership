import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Papership from './pages/papership';

function ToHome() {
  const location = useLocation()
  return <Navigate to={{ pathname: "/", search: location.search, hash: location.hash }} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Papership />} />
        <Route path="/cc-org-dash" element={<ToHome />} />
        <Route path="/EcoOS" element={<ToHome />} />
        <Route path="/ecoos" element={<ToHome />} />
        <Route path="/Dashboard_new" element={<ToHome />} />
        <Route path="/Dashboard" element={<ToHome />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
