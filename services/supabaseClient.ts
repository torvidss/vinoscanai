import { createClient } from '@supabase/supabase-js';

// NOVAS CREDENCIAIS FORNECIDAS (RESET TOTAL)
const SUPABASE_URL = 'https://jtrfdtsissxobkwxagix.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cmZkdHNpc3N4b2Jrd3hhZ2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTQ0MjIsImV4cCI6MjA4Mzg5MDQyMn0.D_s_JkuX1iv87Z3s2XO9eb19ND9rlWqSOlLMEdHOwao'; 

// Inicialização única e limpa do cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
