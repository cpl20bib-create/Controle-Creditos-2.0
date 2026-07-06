import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tdbpxsdvtogymvercpqc.supabase.co';
const supabaseAnonKey = 'sb_publishable_uMAhraANc199PrH8EQD9-w_MW39GXUK';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { error } = await supabase.from('users').upsert([{ id: 'test-user', username: 'test', password: '123', role: 'VIEWER', name: 'Test', assigned_sections: ['Sec1'] }]);
  console.log(error);
}
test();
