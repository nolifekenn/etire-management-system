
import { createBrowserClient } from '@supabase/ssr'

// Database types based on your schema
export interface Database {
  public: {
    Tables: {
      user: {
        Row: {
          user_id: string
          name: string
          username: string
          password: string
          role: number
          created_at: string
          updated_at: string
          uuid?: string // Link to Supabase Auth
        }
        Insert: {
          user_id?: string
          name: string
          username: string
          password: string
          role?: number
          created_at?: string
          updated_at?: string
          uuid?: string
        }
        Update: {
          user_id?: string
          name?: string
          username?: string
          password?: string
          role?: number
          created_at?: string
          updated_at?: string
          uuid?: string
        }
      }
      inventory_item: {
        Row: {
          item_id: string
          name: string
          category: 'tire' | 'tool' | 'accessory'
          vehicle_type: 'car' | 'motor' | 'truck'
          stock_quantity: number
          cost_price: number
          sale_price: number
          reorder_level: number
          branch_id?: string
          supplier_id?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          item_id?: string
          name: string
          category: 'tire' | 'tool' | 'accessory'
          vehicle_type: 'car' | 'motor' | 'truck'
          stock_quantity?: number
          cost_price: number
          sale_price: number
          reorder_level?: number
          branch_id?: string
          supplier_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          item_id?: string
          name?: string
          category?: 'tire' | 'tool' | 'accessory'
          vehicle_type?: 'car' | 'motor' | 'truck'
          stock_quantity?: number
          cost_price?: number
          sale_price?: number
          reorder_level?: number
          branch_id?: string
          supplier_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      sale: {
        Row: {
          sale_id: string
          user_id: string
          customer_id?: string
          branch_id: string
          sale_date: string
          payment_method: 'cash' | 'card' | 'check' | 'credit'
          discount_amount: number
          tax_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          sale_id?: string
          user_id: string
          customer_id?: string
          branch_id: string
          sale_date?: string
          payment_method?: 'cash' | 'card' | 'check' | 'credit'
          discount_amount?: number
          tax_amount?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          sale_id?: string
          user_id?: string
          customer_id?: string
          branch_id?: string
          sale_date?: string
          payment_method?: 'cash' | 'card' | 'check' | 'credit'
          discount_amount?: number
          tax_amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      sale_item: {
        Row: {
          sale_item_id: string
          sale_id: string
          item_id: string
          quantity: number
          price_at_sale: number
          created_at: string
        }
        Insert: {
          sale_item_id?: string
          sale_id: string
          item_id: string
          quantity: number
          price_at_sale: number
          created_at?: string
        }
        Update: {
          sale_item_id?: string
          sale_id?: string
          item_id?: string
          quantity?: number
          price_at_sale?: number
          created_at?: string
        }
      }
      service_job: {
        Row: {
          job_id: string
          user_id: string
          customer_id?: string
          vehicle_id?: string
          job_description: string
          job_date: string
          status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
          service_fee: number
          remarks?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          job_id?: string
          user_id: string
          customer_id?: string
          vehicle_id?: string
          job_description: string
          job_date?: string
          status?: 'pending' | 'in-progress' | 'completed' | 'cancelled'
          service_fee?: number
          remarks?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          job_id?: string
          user_id?: string
          customer_id?: string
          vehicle_id?: string
          job_description?: string
          job_date?: string
          status?: 'pending' | 'in-progress' | 'completed' | 'cancelled'
          service_fee?: number
          remarks?: string
          created_at?: string
          updated_at?: string
        }
      }
      branch: {
        Row: {
          branch_id: string
          name: string
          address?: string
          phone?: string
          email?: string
          manager_id?: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          branch_id?: string
          name: string
          address?: string
          phone?: string
          email?: string
          manager_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          name?: string
          address?: string
          phone?: string
          email?: string
          manager_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      customer: {
        Row: {
          customer_id: string
          name: string
          phone?: string
          email?: string
          address?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          customer_id?: string
          name: string
          phone?: string
          email?: string
          address?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          customer_id?: string
          name?: string
          phone?: string
          email?: string
          address?: string
          created_at?: string
          updated_at?: string
        }
      }
      supplier: {
        Row: {
          supplier_id: string
          name: string
          contact_person?: string
          phone?: string
          email?: string
          address?: string
          payment_terms?: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          supplier_id?: string
          name: string
          contact_person?: string
          phone?: string
          email?: string
          address?: string
          payment_terms?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          supplier_id?: string
          name?: string
          contact_person?: string
          phone?: string
          email?: string
          address?: string
          payment_terms?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if credentials are available
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env.local file.');
  console.error('Required variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('Current values:', { supabaseUrl, supabaseKey });
}

// Create browser client - uses @supabase/ssr which automatically handles cookies
// The proxy.ts file refreshes tokens on server-side, this client reads them on client-side
export const supabase = supabaseUrl && supabaseKey
  ? createBrowserClient<Database>(supabaseUrl, supabaseKey)
  : null

// Utility function to check if credentials are available
export function areSupabaseCredentialsSufficient() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

