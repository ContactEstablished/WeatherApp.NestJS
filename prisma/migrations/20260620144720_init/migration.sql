-- CreateTable
CREATE TABLE "user_preferences" (
    "userId" VARCHAR(120) NOT NULL,
    "unitSystem" VARCHAR(16) NOT NULL DEFAULT 'imperial',
    "createdUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedUtc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "saved_locations" (
    "id" SERIAL NOT NULL,
    "userId" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "region" VARCHAR(160) NOT NULL,
    "country" VARCHAR(80) NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_locations_userId_sortOrder_idx" ON "saved_locations"("userId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "saved_locations_userId_name_region_key" ON "saved_locations"("userId", "name", "region");
