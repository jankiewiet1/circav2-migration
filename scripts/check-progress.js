import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkProgress() {
  const { count: totalCount } = await supabase
    .from('emission_factor_db')
    .select('*', { count: 'exact', head: true });

  const { count: withEmbeddings } = await supabase
    .from('emission_factor_db')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  const { count: withScope } = await supabase
    .from('emission_factor_db')
    .select('*', { count: 'exact', head: true })
    .not('scope', 'is', null);

  console.log(`📊 Progress Report:`);
  console.log(`   Total records: ${totalCount}`);
  console.log(`   With embeddings: ${withEmbeddings} (${Math.round((withEmbeddings/totalCount)*100)}%)`);
  console.log(`   With scope: ${withScope} (${Math.round((withScope/totalCount)*100)}%)`);
  console.log(`   Remaining: ${totalCount - withEmbeddings}`);
}

checkProgress().catch(console.error); 