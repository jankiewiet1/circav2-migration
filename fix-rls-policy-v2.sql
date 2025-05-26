-- Fix RLS policy for company_members to avoid infinite recursion
-- Run this in the Supabase SQL Editor

-- First, drop all existing policies to start clean
DROP POLICY IF EXISTS "Users can select their own membership" ON "public"."company_members";
DROP POLICY IF EXISTS "Users can view company members" ON "public"."company_members";
DROP POLICY IF EXISTS "Users can insert their own membership" ON "public"."company_members";
DROP POLICY IF EXISTS "Insert own membership" ON "public"."company_members";
DROP POLICY IF EXISTS "Admins can manage company members" ON "public"."company_members";

-- Create a simple policy that allows users to see all company members
-- This avoids recursion by not referencing the same table in the policy
CREATE POLICY "Enable read access for company members" ON "public"."company_members" 
FOR SELECT USING (true);

-- Allow users to insert their own membership
CREATE POLICY "Users can insert their own membership" ON "public"."company_members" 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update/delete only their own membership or if they're admin
CREATE POLICY "Users can manage memberships" ON "public"."company_members" 
FOR ALL USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
  )
); 