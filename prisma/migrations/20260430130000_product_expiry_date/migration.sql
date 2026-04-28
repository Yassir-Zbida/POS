-- Optional expiry date for perishable products.
ALTER TABLE `Product` ADD COLUMN `expiryDate` DATETIME(3) NULL;

CREATE INDEX `Product_expiryDate_idx` ON `Product`(`expiryDate`);
