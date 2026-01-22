-- Migration: Add vertical and sub-vertical columns to organizations table
-- Created: 2026-01-22
-- Description: Adds vertical and sub_vertical columns to categorize organizations
--              by their primary business vertical and sub-category

-- Add new columns to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS vertical TEXT,
ADD COLUMN IF NOT EXISTS sub_vertical TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.organizations.vertical IS 'Primary business vertical or industry category';
COMMENT ON COLUMN public.organizations.sub_vertical IS 'Sub-category within the primary vertical';
