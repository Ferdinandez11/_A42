import { createClient } from '@supabase/supabase-js';

// Aquí ponemos tus claves (las he recuperado de tu archivo config.js anterior)
const SUPABASE_URL = "https://ikcjeiyidbrbkbletpxh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrY2plaXlpZGJyYmtibGV0cHhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDM2NTQsImV4cCI6MjA3OTgxOTY1NH0.6x6bLTzHIqqInO2_9N83weQ3SVR0mrQV07pItqpisMs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);