import { Navigate } from 'react-router-dom'

const ProtectedRoute = ({ children }) => {
  // Check for admin token
  const token = localStorage.getItem('dvision_admin_token')
  const isAuthenticated = !!token

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
