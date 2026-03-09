/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabaseClient';
import { Notification } from './types';

/**
 * Notification Service
 * Comprehensive notification system using custom authentication (public.user table)
 * Role-based distribution: staff, branch_manager, super_admin
 */

// ============================
// 🔔 CORE NOTIFICATION FUNCTIONS
// ============================

/**
 * Create a single notification for a user
 */
export async function createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success'
): Promise<{ data: Notification | null; error: any }> {
    if (!supabase) {
        return { data: null, error: 'Supabase client not initialized' };
    }

    try {
        const { data, error } = await (supabase
            .from('notification') as any)
            .insert({
                user_id: userId,
                title,
                message,
                type,
                is_read: false,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating notification:', error);
            return { data: null, error };
        }

        return { data: data as Notification, error: null };
    } catch (error) {
        console.error('Exception creating notification:', error);
        return { data: null, error };
    }
}

/**
 * Create multiple notifications at once (bulk insert)
 */
export async function createBulkNotifications(
    notifications: Array<{
        userId: string;
        title: string;
        message: string;
        type: 'info' | 'warning' | 'error' | 'success';
    }>
): Promise<{ data: Notification[] | null; error: any }> {
    if (!supabase) {
        console.error('[Notification] Supabase client not initialized');
        return { data: null, error: 'Supabase client not initialized' };
    }

    try {
        const notificationRecords = notifications.map((n) => ({
            user_id: n.userId,
            title: n.title,
            message: n.message,
            type: n.type,
            is_read: false,
        }));

        console.log('[Notification] Attempting to insert', notificationRecords.length, 'notifications');

        const { data, error } = await (supabase
            .from('notification') as any)
            .insert(notificationRecords)
            .select();

        if (error) {
            console.error('[Notification] Error creating bulk notifications:', error);
            return { data: null, error };
        }

        console.log('[Notification] Successfully created', data?.length, 'notifications');
        return { data: data as Notification[], error: null };
    } catch (error) {
        console.error('[Notification] Exception creating bulk notifications:', error);
        return { data: null, error };
    }
}

// ============================
// 📦 INVENTORY NOTIFICATIONS
// ============================

/**
 * Check if item is low on stock and notify Staff, Managers, and Admins
 * Call after inventory decreases (sales, service jobs, adjustments)
 */
export async function notifyLowStock(itemId: string): Promise<void> {
    if (!supabase) return;

    try {
        // Get item details
        const { data: item, error: itemError } = await (supabase
            .from('inventory_item') as any)
            .select('item_id, name, category, stock_quantity, reorder_level')
            .eq('item_id', itemId)
            .single();

        if (itemError || !item) {
            console.error('Error fetching item for low stock check:', itemError);
            return;
        }

        // Check if stock is below or at reorder level
        if (item.stock_quantity <= item.reorder_level) {
            // Get Staff, Managers, and Admins (role 1, 2, 3)
            const { data: users, error: usersError } = await (supabase
                .from('user') as any)
                .select('user_id')
                .in('role', ['staff', 'branch_manager', 'super_admin']);

            if (usersError || !users || users.length === 0) {
                console.error('Error fetching users for low stock notification:', usersError);
                return;
            }

            const notifications = users.map((user: any) => ({
                userId: user.user_id,
                title: '⚠️ Low Stock Alert',
                message: `${item.name} (${item.category}) is running low. Current stock: ${item.stock_quantity}, Reorder level: ${item.reorder_level}`,
                type: 'warning' as const,
            }));

            await createBulkNotifications(notifications);
            console.log(`Low stock notifications sent for item: ${item.name}`);
        }
    } catch (error) {
        console.error('Exception in notifyLowStock:', error);
    }
}

/**
 * Notify when stock is replenished above reorder level
 * Call after inventory increases (deliveries, adjustments)
 */
export async function notifyStockReplenishment(itemId: string, previousQuantity: number): Promise<void> {
    if (!supabase) return;

    try {
        // Get item details
        const { data: item, error: itemError } = await (supabase
            .from('inventory_item') as any)
            .select('item_id, name, category, stock_quantity, reorder_level')
            .eq('item_id', itemId)
            .single();

        if (itemError || !item) {
            console.error('Error fetching item for replenishment check:', itemError);
            return;
        }

        // Check if stock was below reorder level and is now above
        if (previousQuantity <= item.reorder_level && item.stock_quantity > item.reorder_level) {
            // Get Staff, Managers, and Admins
            const { data: users, error: usersError } = await (supabase
                .from('user') as any)
                .select('user_id')
                .in('role', ['staff', 'branch_manager', 'super_admin']);

            if (usersError || !users || users.length === 0) {
                console.error('Error fetching users for replenishment notification:', usersError);
                return;
            }

            const notifications = users.map((user: any) => ({
                userId: user.user_id,
                title: '✅ Stock Replenished',
                message: `${item.name} (${item.category}) has been restocked. Current stock: ${item.stock_quantity}`,
                type: 'success' as const,
            }));

            await createBulkNotifications(notifications);
            console.log(`Stock replenishment notifications sent for item: ${item.name}`);
        }
    } catch (error) {
        console.error('Exception in notifyStockReplenishment:', error);
    }
}

// ============================
// 💰 SALES/TRANSACTION NOTIFICATIONS
// ============================

/**
 * Notify on new sale/transaction
 * Notifies: Sale creator, Staff, Managers, and Admins
 */
export async function notifyNewSale(saleId: string, totalAmount: number, creatorId: string): Promise<void> {
    if (!supabase) return;

    try {
        // Get all Staff, Managers, and Admins
        const { data: users, error: usersError } = await (supabase
            .from('user') as any)
            .select('user_id')
            .in('role', ['staff', 'branch_manager', 'super_admin']);

        if (usersError || !users || users.length === 0) {
            console.error('Error fetching users for sale notification:', usersError);
            return;
        }

        // Ensure creator is included even if they're not staff/manager/admin
        const userIds = new Set(users.map((u: any) => u.user_id));
        userIds.add(creatorId);

        const notifications = Array.from(userIds).map((userId: unknown) => ({
            userId: userId as string,
            title: '💵 New Sale Completed',
            message: `A new sale of ₱${totalAmount.toLocaleString()} has been completed.`,
            type: 'success' as const,
        }));

        await createBulkNotifications(notifications);
        console.log(`New sale notifications sent for sale: ${saleId}`);
    } catch (error) {
        console.error('Exception in notifyNewSale:', error);
    }
}

/**
 * Check if today's sales are a new high and notify Admins only
 * Call after each sale is recorded
 */
export async function notifyDailySalesHigh(): Promise<void> {
    if (!supabase) return;

    try {
        const todayTotal = await getTodaysSalesTotal();

        if (todayTotal === 0) {
            return; // No sales today yet
        }

        const previousHigh = await getPreviousHighSales();

        // Check if today exceeds the previous high
        if (todayTotal > previousHigh) {
            // Get Admins only (role 3)
            const { data: admins, error: adminsError } = await (supabase
                .from('user') as any)
                .select('user_id')
                .eq('role', 'super_admin');

            if (adminsError || !admins || admins.length === 0) {
                console.error('Error fetching admins for sales high notification:', adminsError);
                return;
            }

            const notifications = admins.map((admin: any) => ({
                userId: admin.user_id,
                title: '🎉 New Sales Record!',
                message: `Congratulations! Today's sales (₱${todayTotal.toLocaleString()}) have reached a new high, exceeding the previous record of ₱${previousHigh.toLocaleString()}!`,
                type: 'success' as const,
            }));

            await createBulkNotifications(notifications);
            console.log(`Daily sales high notifications sent. New record: ₱${todayTotal}`);
        }
    } catch (error) {
        console.error('Exception in notifyDailySalesHigh:', error);
    }
}

/** Helper: Get today's total sales amount */
async function getTodaysSalesTotal(): Promise<number> {
    if (!supabase) return 0;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: sales, error } = await (supabase
            .from('sale') as any)
            .select('total_amount')
            .gte('sale_date', today.toISOString())
            .lt('sale_date', tomorrow.toISOString());

        if (error || !sales) {
            console.error('Error fetching today\'s sales:', error);
            return 0;
        }

        const total = sales.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
        return total;
    } catch (error) {
        console.error('Exception in getTodaysSalesTotal:', error);
        return 0;
    }
}

/** Helper: Get the previous highest daily sales total (excluding today) */
async function getPreviousHighSales(): Promise<number> {
    if (!supabase) return 0;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: sales, error } = await (supabase
            .from('sale') as any)
            .select('sale_date, total_amount')
            .lt('sale_date', today.toISOString());

        if (error || !sales) {
            console.error('Error fetching historical sales:', error);
            return 0;
        }

        // Group by date and sum totals
        const dailyTotals = new Map<string, number>();
        sales.forEach((sale: any) => {
            const date = new Date(sale.sale_date).toISOString().split('T')[0];
            const current = dailyTotals.get(date) || 0;
            dailyTotals.set(date, current + (sale.total_amount || 0));
        });

        const maxTotal = Math.max(...Array.from(dailyTotals.values()), 0);
        return maxTotal;
    } catch (error) {
        console.error('Exception in getPreviousHighSales:', error);
        return 0;
    }
}

// ============================
// 🔧 SERVICE JOB NOTIFICATIONS
// ============================

/**
 * Notify Staff, Managers, and Admins when a new service job is created
 * Call immediately after creating a service job
 */
export async function notifyNewServiceJob(jobId: string, customerId?: string): Promise<void> {
    if (!supabase) return;

    try {
        // Get job details
        const { data: job, error: jobError } = await (supabase
            .from('service_job') as any)
            .select('job_id, job_description, user_id')
            .eq('job_id', jobId)
            .single();

        if (jobError || !job) {
            console.error('Error fetching job for notification:', jobError);
            return;
        }

        // Get customer name if available
        let customerName = 'Walk-in Customer';
        if (customerId) {
            const { data: customer } = await (supabase
                .from('customer') as any)
                .select('name')
                .eq('customer_id', customerId)
                .single();

            if (customer) {
                customerName = customer.name;
            }
        }

        // Get Staff, Managers, and Admins
        const { data: users, error: usersError } = await (supabase
            .from('user') as any)
            .select('user_id')
            .in('role', ['staff', 'branch_manager', 'super_admin']);

        if (usersError || !users || users.length === 0) {
            console.log('No users to notify for new service job');
            return;
        }

        const notifications = users.map((user: any) => ({
            userId: user.user_id,
            title: '🔧 New Service Job Created',
            message: `A new service job has been created for ${customerName}. Service: ${job.job_description.substring(0, 100)}${job.job_description.length > 100 ? '...' : ''}`,
            type: 'info' as const,
        }));

        await createBulkNotifications(notifications);
        console.log(`New service job notifications sent for job: ${jobId}`);
    } catch (error) {
        console.error('Exception in notifyNewServiceJob:', error);
    }
}

// ============================
// 📋 PURCHASE ORDER NOTIFICATIONS
// ============================

/**
 * Notify everyone when PO delivery deadline is approaching (3 days before)
 * Call this via daily scheduler to check all pending POs
 */
export async function notifyPODeadlineApproaching(poId: string): Promise<void> {
    if (!supabase) return;

    try {
        // Get PO details
        const { data: po, error: poError } = await (supabase
            .from('purchase_order') as any)
            .select('po_id, po_number, expected_delivery_date, supplier_id')
            .eq('po_id', poId)
            .single();

        if (poError || !po || !po.expected_delivery_date) {
            console.error('Error fetching PO for deadline notification:', poError);
            return;
        }

        const deliveryDate = new Date(po.expected_delivery_date);
        const today = new Date();
        const daysUntilDelivery = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Only notify if 3 days or less remaining
        if (daysUntilDelivery <= 3 && daysUntilDelivery > 0) {
            // Get supplier name
            let supplierName = 'Unknown Supplier';
            if (po.supplier_id) {
                const { data: supplier } = await (supabase
                    .from('supplier') as any)
                    .select('name')
                    .eq('supplier_id', po.supplier_id)
                    .single();

                if (supplier) {
                    supplierName = supplier.name;
                }
            }

            // Get ALL Staff, Managers, and Admins
            const { data: users, error: usersError } = await (supabase
                .from('user') as any)
                .select('user_id')
                .in('role', ['staff', 'branch_manager', 'super_admin']);

            if (usersError || !users || users.length === 0) {
                console.error('Error fetching users for PO deadline notification:', usersError);
                return;
            }

            const notifications = users.map((user: any) => ({
                userId: user.user_id,
                title: '⏰ PO Delivery Approaching',
                message: `Purchase Order ${po.po_number} from ${supplierName} is due in ${daysUntilDelivery} day(s). Expected: ${deliveryDate.toLocaleDateString()}`,
                type: 'warning' as const,
            }));

            await createBulkNotifications(notifications);
            console.log(`PO deadline notifications sent for PO: ${po.po_number}`);
        }
    } catch (error) {
        console.error('Exception in notifyPODeadlineApproaching:', error);
    }
}

/**
 * Notify everyone when PO delivery is overdue
 * Call this via daily scheduler to check all pending POs
 */
export async function notifyPOOverdue(poId: string): Promise<void> {
    if (!supabase) return;

    try {
        // Get PO details
        const { data: po, error: poError } = await (supabase
            .from('purchase_order') as any)
            .select('po_id, po_number, expected_delivery_date, supplier_id, status')
            .eq('po_id', poId)
            .single();

        if (poError || !po || !po.expected_delivery_date) {
            console.error('Error fetching PO for overdue notification:', poError);
            return;
        }

        // Only notify if not yet delivered and past due date
        if (po.status !== 'delivered') {
            const deliveryDate = new Date(po.expected_delivery_date);
            const today = new Date();
            const daysOverdue = Math.ceil((today.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysOverdue > 0) {
                // Get supplier name
                let supplierName = 'Unknown Supplier';
                if (po.supplier_id) {
                    const { data: supplier } = await (supabase
                        .from('supplier') as any)
                        .select('name')
                        .eq('supplier_id', po.supplier_id)
                        .single();

                    if (supplier) {
                        supplierName = supplier.name;
                    }
                }

                // Get ALL Staff, Managers, and Admins
                const { data: users, error: usersError } = await (supabase
                    .from('user') as any)
                    .select('user_id')
                    .in('role', ['staff', 'branch_manager', 'super_admin']);

                if (usersError || !users || users.length === 0) {
                    console.error('Error fetching users for PO overdue notification:', usersError);
                    return;
                }

                const notifications = users.map((user: any) => ({
                    userId: user.user_id,
                    title: '🚨 PO Delivery Overdue',
                    message: `Purchase Order ${po.po_number} from ${supplierName} is ${daysOverdue} day(s) overdue. Expected: ${deliveryDate.toLocaleDateString()}`,
                    type: 'error' as const,
                }));

                await createBulkNotifications(notifications);
                console.log(`PO overdue notifications sent for PO: ${po.po_number}`);
            }
        }
    } catch (error) {
        console.error('Exception in notifyPOOverdue:', error);
    }
}

/**
 * Check all pending POs and send deadline/overdue notifications
 * Call this daily via scheduler
 */
export async function checkPODeadlines(): Promise<void> {
    if (!supabase) return;

    try {
        // Get all pending/ordered POs with expected delivery dates
        const { data: pos, error } = await (supabase
            .from('purchase_order') as any)
            .select('po_id, expected_delivery_date')
            .in('status', ['pending', 'approved', 'ordered'])
            .not('expected_delivery_date', 'is', null);

        if (error || !pos) {
            console.error('Error fetching POs for deadline check:', error);
            return;
        }

        // Check each PO for approaching deadline or overdue status
        for (const po of pos as any[]) {
            await notifyPODeadlineApproaching(po.po_id);
            await notifyPOOverdue(po.po_id);
        }
    } catch (error) {
        console.error('Exception in checkPODeadlines:', error);
    }
}

// ============================
// 👥 CUSTOMER NOTIFICATIONS
// ============================

/**
 * Notify Staff, Managers, and Admins when a new customer is created
 * Call immediately after customer creation
 */
export async function notifyNewCustomer(customerId: string): Promise<void> {
    if (!supabase) return;

    try {
        // Get customer details
        const { data: customer, error: customerError } = await (supabase
            .from('customer') as any)
            .select('customer_id, name, phone, email')
            .eq('customer_id', customerId)
            .single();

        if (customerError || !customer) {
            console.error('Error fetching customer for notification:', customerError);
            return;
        }

        // Get Staff, Managers, and Admins
        const { data: users, error: usersError } = await (supabase
            .from('user') as any)
            .select('user_id')
            .in('role', ['staff', 'branch_manager', 'super_admin']);

        if (usersError || !users || users.length === 0) {
            console.error('Error fetching users for new customer notification:', usersError);
            return;
        }

        const contactInfo = customer.phone || customer.email || 'No contact info';
        const notifications = users.map((user: any) => ({
            userId: user.user_id,
            title: '👤 New Customer Registered',
            message: `New customer "${customer.name}" has been added to the system. Contact: ${contactInfo}`,
            type: 'info' as const,
        }));

        await createBulkNotifications(notifications);
        console.log(`New customer notifications sent for customer: ${customer.name}`);
    } catch (error) {
        console.error('Exception in notifyNewCustomer:', error);
    }
}

// ============================
// 🔐 USER REGISTRATION NOTIFICATIONS
// ============================

/**
 * Notify all Admins when a new user registers
 * Call immediately after user account creation
 */
export async function notifyNewUserRegistration(newUserId: string, newUserName: string): Promise<void> {
    if (!supabase) return;

    try {
        // Get Admins only (role 3)
        const { data: admins, error: adminsError } = await (supabase
            .from('user') as any)
            .select('user_id')
            .eq('role', 'super_admin');

        if (adminsError || !admins || admins.length === 0) {
            console.error('Error fetching admins for user registration notification:', adminsError);
            return;
        }

        const notifications = admins.map((admin: any) => ({
            userId: admin.user_id,
            title: '🆕 New User Registered',
            message: `A new user "${newUserName}" has been registered in the system. Please review their account and assign appropriate permissions.`,
            type: 'info' as const,
        }));

        await createBulkNotifications(notifications);
        console.log(`New user registration notifications sent for user: ${newUserName}`);
    } catch (error) {
        console.error('Exception in notifyNewUserRegistration:', error);
    }
}

// ============================
// 💾 SYSTEM NOTIFICATIONS
// ============================

/**
 * Send weekly backup reminder to all Admins
 * Call this manually or via weekly scheduler
 */
export async function notifyWeeklyBackup(): Promise<void> {
    if (!supabase) return;

    try {
        // Get Admins only (role 3)
        const { data: admins, error: adminsError } = await (supabase
            .from('user') as any)
            .select('user_id')
            .eq('role', 'super_admin');

        if (adminsError || !admins || admins.length === 0) {
            console.error('Error fetching admins for backup reminder:', adminsError);
            return;
        }

        const notifications = admins.map((admin: any) => ({
            userId: admin.user_id,
            title: '💾 Weekly Backup Reminder',
            message: `This is your weekly reminder to perform a system backup. Please ensure all critical data is backed up securely.`,
            type: 'warning' as const,
        }));

        await createBulkNotifications(notifications);
        console.log('Weekly backup reminder notifications sent to admins');
    } catch (error) {
        console.error('Exception in notifyWeeklyBackup:', error);
    }
}

// ============================
// 🛠️ UTILITY FUNCTIONS
// ============================

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<{ error: any }> {
    if (!supabase) {
        return { error: 'Supabase client not initialized' };
    }

    const { error } = await (supabase
        .from('notification') as any)
        .update({ is_read: true })
        .eq('notification_id', notificationId);

    return { error };
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<{ error: any }> {
    if (!supabase) {
        return { error: 'Supabase client not initialized' };
    }

    const { error } = await (supabase
        .from('notification') as any)
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    return { error };
}

/**
 * Delete a notification
 */
/**
 * Soft delete a notification by setting deleted_at timestamp
 */
export async function deleteNotification(notificationId: string): Promise<{ error: any }> {
    if (!supabase) {
        return { error: 'Supabase client not initialized' };
    }

    // Soft delete: set deleted_at timestamp instead of removing the record
    const { error } = await supabase
        .from('notification')
        .update({ deleted_at: new Date().toISOString() })
        .eq('notification_id', notificationId);

    return { error };
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<{ count: number; error: any }> {
    if (!supabase) {
        return { count: 0, error: 'Supabase client not initialized' };
    }

    const { count, error } = await supabase
        .from('notification')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    return { count: count || 0, error };
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(
    userId: string,
    limit: number = 50
): Promise<{ data: Notification[] | null; error: any }> {
    if (!supabase) {
        return { data: null, error: 'Supabase client not initialized' };
    }

    const { data, error } = await supabase
        .from('notification')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    return { data: data as Notification[] | null, error };
}
