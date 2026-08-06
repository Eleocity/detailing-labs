-- Forma Auto Spa rebrand: fix admin-editable site copy that has the old
-- brand name baked into stored text (siteContent/businessSettings rows are
-- managed through the Admin Site Editor, so source-code edits alone don't
-- reach them).
--
-- Safe by construction: REPLACE() is a no-op wherever the substring isn't
-- present, so this does nothing if content was already updated by an admin,
-- and it won't touch rows unrelated to the old brand name. No table is
-- assumed to be non-empty or to contain specific rows.

UPDATE siteContent
SET value = REPLACE(value, 'Detailing Labs', 'Forma Auto Spa')
WHERE value LIKE '%Detailing Labs%';

UPDATE businessSettings
SET value = REPLACE(value, 'Detailing Labs', 'Forma Auto Spa')
WHERE value LIKE '%Detailing Labs%';

-- Correct the business phone number only if it's currently empty or a known
-- placeholder — never overwrite a real value an admin may have entered.
UPDATE siteContent
SET value = '(262) 260-9474'
WHERE section = 'contact' AND `key` = 'phone'
  AND (value IS NULL OR value = '' OR value LIKE '(555)%' OR value = '(262) 555-0190');
