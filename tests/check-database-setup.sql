-- Script to check database setup for Climatiq integration
-- Run this in the Supabase SQL Editor to verify your setup

-- 1. Check if emission_calc_climatiq table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'emission_calc_climatiq'
) as "Table Exists";

-- 2. Show table schema
\d emission_calc_climatiq;

-- 3. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'emission_calc_climatiq';

-- 4. Show RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies
WHERE tablename = 'emission_calc_climatiq';

-- 5. Check if related functions exist
SELECT 
    routine_name, 
    routine_type, 
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%emission%climatiq%';

-- 6. Check if there's any data in the table
SELECT count(*) FROM emission_calc_climatiq;

-- 7. Check for other related views
SELECT 
    table_name, 
    table_type 
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%emission%climatiq%'
AND table_type = 'VIEW';

-- 8. Check table indexes
SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'emission_calc_climatiq';

-- 9. Check for triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'emission_calc_climatiq'
AND trigger_schema = 'public'; 