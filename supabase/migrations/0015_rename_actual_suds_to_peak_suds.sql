ALTER TABLE public.fear_ladder_items RENAME COLUMN actual_suds TO peak_suds;
COMMENT ON COLUMN public.fear_ladder_items.peak_suds IS 'Peak distress reached during completed session. Set by session completion enqueue (Story 5.2+). Renamed from actual_suds.';
