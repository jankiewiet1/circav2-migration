-- Fix RLS policy for company_members to allow viewing all company members
-- Run this in the Supabase SQL Editor

-- Drop the restrictive policy that only allows users to see their own membership
DROP POLICY IF EXISTS "Users can select their own membership" ON "public"."company_members";

-- Create a new policy that allows users to see all members of companies they belong to
CREATE POLICY "Users can view company members" ON "public"."company_members" 
FOR SELECT USING (
  company_id IN (
    SELECT company_id 
    FROM company_members 
    WHERE user_id = auth.uid()
  )
);

-- Ensure users can still insert their own membership (clean up duplicates first)
DROP POLICY IF EXISTS "Users can insert their own membership" ON "public"."company_members";
DROP POLICY IF EXISTS "Insert own membership" ON "public"."company_members";

CREATE POLICY "Users can insert their own membership" ON "public"."company_members" 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow admins to manage company members
CREATE POLICY "Admins can manage company members" ON "public"."company_members" 
FOR ALL USING (
  EXISTS (
    SELECT 1 
    FROM company_members cm 
    WHERE cm.company_id = company_members.company_id 
    AND cm.user_id = auth.uid() 
    AND cm.role = 'admin'
  )
); 