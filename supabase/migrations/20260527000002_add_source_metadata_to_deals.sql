-- Add missing columns to deals that autoCreateDeal (messaging webhook) requires.
-- Without these, the insert fails silently and deal_id never gets set in
-- messaging_conversations.metadata, breaking the entire AI auto-response pipeline.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Index for fast lookup by source (whatsapp, instagram, etc.)
CREATE INDEX IF NOT EXISTS idx_deals_source
  ON public.deals (organization_id, source)
  WHERE source IS NOT NULL;

COMMENT ON COLUMN public.deals.source IS 'Origin channel: whatsapp, instagram, manual, etc.';
COMMENT ON COLUMN public.deals.metadata IS 'Arbitrary key-value store — used by auto-creation, integrations, and simulations.';
