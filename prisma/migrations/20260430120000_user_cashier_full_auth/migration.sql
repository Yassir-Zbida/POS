-- Last full auth timestamp for cashier PIN-only window (30 days).
ALTER TABLE `User` ADD COLUMN `cashierFullAuthAt` DATETIME(3) NULL;
