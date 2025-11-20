// Temporary test file to verify Supabase connection
import { supabase } from './supabase'

export async function testSupabaseConnection() {
  try {
    // Test connection by querying a simple table
    const { data, error } = await supabase.from('_test').select('count').limit(1)
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 means table doesn't exist, which is expected
      console.error('Supabase connection error:', error)
      return false
    }
    
    console.log('✅ Supabase connection successful!')
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    return false
  }
}

