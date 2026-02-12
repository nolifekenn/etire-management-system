"use client";

import { useAuth } from './useAuth';

export const useRoleAccess = () => {
  const { user } = useAuth();

  const hasRole = (requiredRole: number): boolean => {
    if (!user) return false;
    return user.role >= requiredRole;
  };

  const isAdmin = (): boolean => {
    return hasRole(2);
  };

  const isEmployee = (): boolean => {
    return hasRole(1);
  };

  const isGuest = (): boolean => {
    return user?.role === 0;
  };

  const canAccess = (requiredRole: number): boolean => {
    return hasRole(requiredRole);
  };

  const getRoleName = (): string => {
    if (!user) return 'Unknown';
    
    switch (user.role) {
      case 0:
        return 'Guest';
      case 1:
        return 'Employee';
      case 2:
        return 'Admin';
      default:
        return 'Unknown';
    }
  };

  const getRoleColor = (): string => {
    if (!user) return 'text-gray-500';
    
    switch (user.role) {
      case 0:
        return 'text-yellow-600';
      case 1:
        return 'text-blue-600';
      case 2:
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return {
    user,
    hasRole,
    isAdmin,
    isEmployee,
    isGuest,
    canAccess,
    getRoleName,
    getRoleColor,
  };
};
