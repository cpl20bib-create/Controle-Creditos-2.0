import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tdbpxsdvtogymvercpqc.supabase.co';
const supabaseAnonKey = 'sb_publishable_uMAhraANc199PrH8EQD9-w_MW39GXUK';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('audit_logs').insert([{
    id: Math.random().toString(),
    userId: '1',
    userName: 'Test',
    action: 'CREATE',
    entityType: 'CRÉDITO',
    entityId: '123',
    description: 'Test log',
    timestamp: new Date().toISOString()
  }]);
  console.log('Error:', error);
}
test();
