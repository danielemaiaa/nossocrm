-- Fix orphaned lead_routing_rules where board_id was set to NULL.
-- These rows block auto-deal creation because getLeadRoutingRule returns null
-- when board_id IS NULL, even if enabled = true.
--
-- Also links any conversation that already has a deal but lost the metadata reference.

-- 1. Remove orphaned routing rules (board_id = NULL and enabled = true means "active but useless").
--    Safe to delete: the edge function would return null for these rows anyway.
DELETE FROM lead_routing_rules
WHERE board_id IS NULL;

-- 2. Re-create the routing rule for the WABA channel pointing to the first stage of the SDR board.
--    Uses ON CONFLICT to be idempotent in case a valid rule was already re-created via UI.
INSERT INTO lead_routing_rules (organization_id, channel_id, board_id, stage_id, enabled)
SELECT
  '49498ace-3345-49ed-a967-48f269d86fa8',
  '3ea50849-5103-4ae4-88b1-8d007559cd16',
  '72a57f93-9a30-49e9-8dba-2dcab5fda913',
  bs.id,
  true
FROM board_stages bs
WHERE bs.board_id = '72a57f93-9a30-49e9-8dba-2dcab5fda913'
ORDER BY bs."order" ASC
LIMIT 1
ON CONFLICT (channel_id) DO UPDATE
  SET board_id  = EXCLUDED.board_id,
      stage_id  = EXCLUDED.stage_id,
      enabled   = true,
      updated_at = now();

-- 3. Link existing conversation to its deal so the AI agent can process it.
UPDATE messaging_conversations
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'),
  '{deal_id}',
  '"bb567b00-8fcd-447c-8d1e-f5dac2ec5c4f"'
)
WHERE id = '23fc5cad-a520-41d1-b127-d6730a35b3c9'
  AND COALESCE(metadata->>'deal_id', '') = '';
