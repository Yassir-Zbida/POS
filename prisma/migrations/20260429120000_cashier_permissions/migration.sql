-- Nullable JSON: null means "full access" (legacy cashiers)
ALTER TABLE `User` ADD COLUMN `cashierPermissions` JSON NULL;
