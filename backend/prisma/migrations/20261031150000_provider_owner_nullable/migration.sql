-- Provider store can be created without an owner user; assign later.

ALTER TABLE "providers" ALTER COLUMN "ownerUserId" DROP NOT NULL;
