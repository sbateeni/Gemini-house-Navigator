
import { createClient } from '@supabase/supabase-js';

// Updated credentials for project: znktftvhkoxrmmucdgms
const supabaseUrl = 'https://znktftvhkoxrmmucdgms.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpua3RmdHZoa294cm1tdWNkZ21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NTg4MDYsImV4cCI6MjA3OTUzNDgwNn0.TJnzlXx7PR82HuEDWVLro1i3ssT56U1ahfF3eacvTeo';

export const supabase = createClient(supabaseUrl, supabaseKey);
