import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ktnpqmhlzzplrfkuwfpo.supabase.co";

const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0bnBxbWhsenpwbHJma3V3ZnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDAwNTEsImV4cCI6MjA5NjQ3NjA1MX0.-ANuJyaKXb7WtJmusnE2mIIuf7LMXa7LWUF-rb0vfc0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);