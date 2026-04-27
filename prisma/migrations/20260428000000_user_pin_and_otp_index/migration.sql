-- User security fields (PIN + OTP) — must match `schema.prisma` User model
ALTER TABLE `User` ADD COLUMN `otpEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `pinAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `pinLockedUntil` DATETIME(3) NULL;

-- Align index name with current Prisma schema (see 20260424220000_otp_challenge)
ALTER TABLE `OtpChallenge` RENAME INDEX `OtpChallenge_target_purpose_idx` TO `OtpChallenge_target_purpose_consumedAt_idx`;