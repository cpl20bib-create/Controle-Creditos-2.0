import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tdbpxsdvtogymvercpqc.supabase.co';
const supabaseAnonKey = 'sb_publishable_uMAhraANc199PrH8EQD9-w_MW39GXUK';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('audit_logs').select('*');
  console.log('Error:', error);
  console.log('Data count:', data ? data.length : null);
}
test();
