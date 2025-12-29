import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zlggbryckwqvxqfliped.supabase.co"; 
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZ2dicnlja3dxdnhxZmxpcGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTM1NjQsImV4cCI6MjA3ODg2OTU2NH0.c4J9QT3agikkY1xBLM3hc43-El8jGYNgXL_y_AHF6sU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);