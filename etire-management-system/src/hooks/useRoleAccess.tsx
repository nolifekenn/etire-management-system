"use client";

import { useAuth } from './useAuth';
import { UserRole } from '@/lib/types';

/**
 * Role hierarchy for permission checks
 * Higher number = more permissions
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  'super_admin': 100,
  'branch_manager': 50,
  'staff': 20,
  'cashier': 10,
};

/**
 * Role display names
 */
const ROLE_NAMES: Record<UserRole, string> = {
  'super_admin': 'Super Admin',
  'branch_manager': 'Branch Manager',
  'staff': 'Staff',
  'cashier': 'Cashier',
};

/**
 * Role colors for UI
 */
const ROLE_COLORS: Record<UserRole, string> = {
  'super_admin': 'text-red-600',
  'branch_manager': 'text-purple-600',
  'staff': 'text-blue-600',
  'cashier': 'text-green-600',
};

/**
 * Role badge styles for UI
 */
const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  'super_admin': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  'branch_manager': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
  'staff': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  'cashier': 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
};

export const useRoleAccess = () => {
  const { user } = useAuth();

  /**
   * Check if current user has at least the specified role level
   * @param requiredRole - Minimum role required
   */
  const hasMinRole = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    const userLevel = ROLE_HIERARCHY[user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    return userLevel >= requiredLevel;
  };

  /**
   * Check if user has exactly the specified role
   */
  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  // Role-specific checks
  const isSuperAdmin = (): boolean => user?.role === 'super_admin';
  const isBranchManager = (): boolean => hasMinRole('branch_manager');
  const isStaff = (): boolean => hasMinRole('staff');
  const isCashier = (): boolean => hasMinRole('cashier');

  // Admin includes super_admin and branch_manager
  const isAdmin = (): boolean => hasAnyRole(['super_admin', 'branch_manager']);

  /**
   * Check if user can manage other users
   */
  const canManageUsers = (): boolean => {
    return hasAnyRole(['super_admin', 'branch_manager']);
  };

  /**
   * Check if user can access settings
   */
  const canAccessSettings = (): boolean => {
    return hasAnyRole(['super_admin', 'branch_manager']);
  };

  /**
   * Check if user can access audit logs
   */
  const canAccessAuditLogs = (): boolean => {
    return hasAnyRole(['super_admin', 'branch_manager']);
  };

  /**
   * Check if user can switch branches (super_admin only)
   */
  const canSwitchBranches = (): boolean => {
    return user?.role === 'super_admin';
  };

  /**
   * Get normalized role name for display
   */
  const getRoleName = (): string => {
    if (!user) return 'Unknown';
    return ROLE_NAMES[user.role] || 'Unknown';
  };

  /**
   * Get role-specific text color class
   */
  const getRoleColor = (): string => {
    if (!user) return 'text-gray-500';
    return ROLE_COLORS[user.role] || 'text-gray-500';
  };

  /**
   * Get role-specific badge style class
   */
  const getRoleBadgeStyle = (): string => {
    if (!user) return 'bg-gray-50 text-gray-700 border-gray-200';
    return ROLE_BADGE_STYLES[user.role] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  /**
   * Get role badge style for any role (static method)
   */
  const getBadgeStyleForRole = (role: UserRole): string => {
    return ROLE_BADGE_STYLES[role] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  /**
   * Get role name for any role (static method)
   */
  const getNameForRole = (role: UserRole): string => {
    return ROLE_NAMES[role] || 'Unknown';
  };

  return {
    user,
    hasRole,
    hasMinRole,
    hasAnyRole,
    isSuperAdmin,
    isBranchManager,
    isStaff,
    isCashier,
    isAdmin,
    canManageUsers,
    canAccessSettings,
    canAccessAuditLogs,
    canSwitchBranches,
    getRoleName,
    getRoleColor,
    getRoleBadgeStyle,
    getBadgeStyleForRole,
    getNameForRole,
  };
};

// Export constants for use in other components
export { ROLE_HIERARCHY, ROLE_NAMES, ROLE_COLORS, ROLE_BADGE_STYLES };
