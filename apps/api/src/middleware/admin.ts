/** @format */

import { requireRole } from './authorization';

/**
 * Middleware that restricts access to admin-level users (superadmin or tenant-admin).
 * Rejects staff and customer roles with 403.
 *
 * Convenience wrapper around requireRole('superadmin', 'tenant-admin').
 */
export const requireAdmin = requireRole('superadmin', 'tenant-admin');
