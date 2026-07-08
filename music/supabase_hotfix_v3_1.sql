-- Disney Music Quest v2.8 Hotfix
-- Verwijdert de check constraint op question_type in dmq_rounds zodat alle nieuwe combinaties worden geaccepteerd.

alter table public.dmq_rounds drop constraint if exists dmq_rounds_question_type_check;
