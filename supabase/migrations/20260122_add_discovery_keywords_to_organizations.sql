-- Migration: Add discovery and keywords columns to organizations table
-- Created: 2026-01-22
-- Description: Adds discovery_search_terms, discovery_sources, and keywords columns 
--              to track how organizations were discovered and relevant SEO keywords

-- Add new columns to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS discovery_search_terms TEXT,
ADD COLUMN IF NOT EXISTS discovery_sources JSONB,
ADD COLUMN IF NOT EXISTS keywords TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.organizations.discovery_search_terms IS 'Search terms used to discover this organization';
COMMENT ON COLUMN public.organizations.discovery_sources IS 'JSON array of SERP results and sources used for discovery';
COMMENT ON COLUMN public.organizations.keywords IS 'Comma-separated keywords for SEO and categorization';
