import { Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/iniciar-sesion" element={<div>Iniciar Sesión</div>} />
      <Route path="/panel" element={<div>Panel</div>} />
      <Route path="*" element={<Navigate to="/iniciar-sesion" />} />
    </Routes>
  )
}

export default App