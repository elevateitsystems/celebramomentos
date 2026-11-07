-- Printeers replaces AlerioPrint for phone cases. Additive only: existing
-- ALERIO_PRINT fulfilments and order items keep their provider.
ALTER TYPE "PodProvider" ADD VALUE IF NOT EXISTS 'PRINTEERS';
