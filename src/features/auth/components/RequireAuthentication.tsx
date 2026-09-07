import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from '../services/authSession';

export function RequireAuthentication() {
  return isAuthenticated() ? <Outlet /> : <Navigate replace to="/login" />;
}