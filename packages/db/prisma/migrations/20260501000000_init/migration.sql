-- =============================================================================
-- Initial migration — creates the entire schema for "Aneh et HaShoel".
-- Generated to match prisma/schema.prisma. Run with: prisma migrate deploy.
-- =============================================================================

-- Required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE "FinancialCategory" AS ENUM ('OFFICIAL', 'UNOFFICIAL');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'PRINT', 'APPROVE', 'REJECT');
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'BUSINESS', 'ORGANIZATION', 'GOVERNMENT');
CREATE TYPE "AddressType" AS ENUM ('BILLING', 'SHIPPING', 'BUSINESS', 'HOME', 'EVENT_VENUE');
CREATE TYPE "DocumentType" AS ENUM ('CONTRACT', 'INVOICE', 'RECEIPT', 'QUOTE', 'PROPOSAL', 'PHOTO', 'CERTIFICATE', 'OTHER');
CREATE TYPE "NoteVisibility" AS ENUM ('PRIVATE', 'TEAM', 'PUBLIC');
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');
CREATE TYPE "EventType" AS ENUM ('WEDDING', 'BAR_MITZVAH', 'BAT_MITZVAH', 'BRIT_MILAH', 'ENGAGEMENT', 'SHEVA_BRACHOT', 'CORPORATE', 'CONFERENCE', 'PRIVATE_PARTY', 'OTHER');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "DeliveryStatus" AS ENUM ('SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'BIT', 'PAYBOX', 'OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIAL');
CREATE TYPE "InventoryMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'WASTE', 'RETURN');
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RETIRED', 'PROBATION');
CREATE TYPE "ShiftStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'IN_APP');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');
CREATE TYPE "WebhookEvent" AS ENUM ('EVENT_CREATED', 'EVENT_UPDATED', 'PAYMENT_RECEIVED', 'ORDER_PLACED', 'CUSTOMER_CREATED', 'INVOICE_PAID', 'CUSTOM');
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- =============================================================================
-- IDENTITY & ACCESS
-- =============================================================================
CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "email" CITEXT NOT NULL,
  "phone" TEXT,
  "password_hash" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
  "last_login_at" TIMESTAMP(3),
  "preferences" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");
CREATE INDEX "users_tenant_id_status_idx" ON "users"("tenant_id", "status");
CREATE INDEX "users_email_idx" ON "users"("email");

CREATE TABLE "roles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "description" TEXT,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");
CREATE INDEX "roles_tenant_id_idx" ON "roles"("tenant_id");

CREATE TABLE "user_roles" (
  "user_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assigned_by" UUID,
  PRIMARY KEY ("user_id", "role_id")
);
CREATE INDEX "user_roles_tenant_id_idx" ON "user_roles"("tenant_id");
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;

CREATE TABLE "permissions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID,
  "resource" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "permissions_resource_action_tenant_id_key" ON "permissions"("resource", "action", "tenant_id");
CREATE INDEX "permissions_tenant_id_idx" ON "permissions"("tenant_id");

CREATE TABLE "role_permissions" (
  "role_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  PRIMARY KEY ("role_id", "permission_id")
);
CREATE INDEX "role_permissions_tenant_id_idx" ON "role_permissions"("tenant_id");
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE;

CREATE TABLE "sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL UNIQUE,
  "refresh_hash" TEXT UNIQUE,
  "ip" TEXT,
  "user_agent" TEXT,
  "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3)
);
CREATE INDEX "sessions_tenant_id_idx" ON "sessions"("tenant_id");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE INDEX "sessions_status_idx" ON "sessions"("status");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE TABLE "api_keys" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID,
  "name" TEXT NOT NULL,
  "key_hash" TEXT NOT NULL UNIQUE,
  "prefix" TEXT NOT NULL,
  "scopes" TEXT[],
  "last_used_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "api_keys_tenant_id_idx" ON "api_keys"("tenant_id");
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");
CREATE INDEX "api_keys_prefix_idx" ON "api_keys"("prefix");
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE TABLE "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "action" "AuditAction" NOT NULL,
  "old_values" JSONB,
  "new_values" JSONB,
  "ip" TEXT,
  "user_agent" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");
CREATE INDEX "audit_logs_tenant_id_entity_type_entity_id_idx" ON "audit_logs"("tenant_id", "entity_type", "entity_id");
CREATE INDEX "audit_logs_tenant_id_timestamp_idx" ON "audit_logs"("tenant_id", "timestamp");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;

-- =============================================================================
-- CRM
-- =============================================================================
CREATE TABLE "customers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "type" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL',
  "name" TEXT NOT NULL,
  "hebrew_name" TEXT,
  "tax_id" TEXT,
  "email" CITEXT,
  "phone" TEXT,
  "website" TEXT,
  "notes" TEXT,
  "credit_limit" DECIMAL(14,2),
  "payment_term_days" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");
CREATE INDEX "customers_tenant_id_name_idx" ON "customers"("tenant_id", "name");
CREATE INDEX "customers_tenant_id_is_active_idx" ON "customers"("tenant_id", "is_active");
CREATE INDEX "customers_tax_id_idx" ON "customers"("tax_id");

CREATE TABLE "contact_persons" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "role" TEXT,
  "email" CITEXT,
  "phone" TEXT,
  "mobile" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);
CREATE INDEX "contact_persons_tenant_id_idx" ON "contact_persons"("tenant_id");
CREATE INDEX "contact_persons_customer_id_idx" ON "contact_persons"("customer_id");
ALTER TABLE "contact_persons" ADD CONSTRAINT "contact_persons_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;

CREATE TABLE "venues" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "capacity" INTEGER,
  "hourly_rate" DECIMAL(12,2),
  "amenities" TEXT[],
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "venues_tenant_id_idx" ON "venues"("tenant_id");
CREATE INDEX "venues_tenant_id_is_active_idx" ON "venues"("tenant_id", "is_active");

CREATE TABLE "addresses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID,
  "venue_id" UUID,
  "type" "AddressType" NOT NULL DEFAULT 'BILLING',
  "street" TEXT NOT NULL,
  "house_num" TEXT,
  "apartment" TEXT,
  "city" TEXT NOT NULL,
  "region" TEXT,
  "postal_code" TEXT,
  "country" TEXT NOT NULL DEFAULT 'IL',
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "addresses_tenant_id_idx" ON "addresses"("tenant_id");
CREATE INDEX "addresses_customer_id_idx" ON "addresses"("customer_id");
CREATE INDEX "addresses_venue_id_idx" ON "addresses"("venue_id");
CREATE INDEX "addresses_city_idx" ON "addresses"("city");
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE;

CREATE TABLE "tags" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "tags_tenant_id_name_key" ON "tags"("tenant_id", "name");
CREATE INDEX "tags_tenant_id_idx" ON "tags"("tenant_id");

CREATE TABLE "customer_tags" (
  "customer_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "tagged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("customer_id", "tag_id")
);
CREATE INDEX "customer_tags_tenant_id_idx" ON "customer_tags"("tenant_id");
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE;

-- =============================================================================
-- CATEGORIES, PRODUCTS, INVENTORY, RECIPES
-- =============================================================================
CREATE TABLE "categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "parent_id" UUID,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "categories_tenant_id_name_parent_id_key" ON "categories"("tenant_id", "name", "parent_id");
CREATE INDEX "categories_tenant_id_idx" ON "categories"("tenant_id");
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id");

CREATE TABLE "products" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "category_id" UUID,
  "sku" TEXT,
  "name" TEXT NOT NULL,
  "hebrew_name" TEXT,
  "description" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'יחידה',
  "unit_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "barcode" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_perishable" BOOLEAN NOT NULL DEFAULT false,
  "shelf_life_days" INTEGER,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "products_tenant_id_sku_key" ON "products"("tenant_id", "sku");
CREATE INDEX "products_tenant_id_idx" ON "products"("tenant_id");
CREATE INDEX "products_tenant_id_is_active_idx" ON "products"("tenant_id", "is_active");
CREATE INDEX "products_category_id_idx" ON "products"("category_id");
CREATE INDEX "products_barcode_idx" ON "products"("barcode");
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id");

CREATE TABLE "suppliers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "hebrew_name" TEXT,
  "tax_id" TEXT,
  "contact_name" TEXT,
  "email" CITEXT,
  "phone" TEXT,
  "address" TEXT,
  "payment_term_days" INTEGER,
  "rating" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);
CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers"("tenant_id");
CREATE INDEX "suppliers_tenant_id_is_active_idx" ON "suppliers"("tenant_id", "is_active");
CREATE INDEX "suppliers_tax_id_idx" ON "suppliers"("tax_id");

CREATE TABLE "supplier_prices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ILS',
  "min_quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
  "lead_time_days" INTEGER,
  "valid_from" TIMESTAMP(3) NOT NULL,
  "valid_to" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "supplier_prices_supplier_id_product_id_valid_from_key" ON "supplier_prices"("supplier_id", "product_id", "valid_from");
CREATE INDEX "supplier_prices_tenant_id_idx" ON "supplier_prices"("tenant_id");
CREATE INDEX "supplier_prices_product_id_idx" ON "supplier_prices"("product_id");
CREATE INDEX "supplier_prices_supplier_id_idx" ON "supplier_prices"("supplier_id");
ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE;
ALTER TABLE "supplier_prices" ADD CONSTRAINT "supplier_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;

CREATE TABLE "inventory_movements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "type" "InventoryMovementType" NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unit_cost" DECIMAL(12,2),
  "reference" TEXT,
  "reason" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "inventory_movements_tenant_id_idx" ON "inventory_movements"("tenant_id");
CREATE INDEX "inventory_movements_product_id_idx" ON "inventory_movements"("product_id");
CREATE INDEX "inventory_movements_occurred_at_idx" ON "inventory_movements"("occurred_at");
CREATE INDEX "inventory_movements_type_idx" ON "inventory_movements"("type");
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;

CREATE TABLE "stock_levels" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "location" TEXT NOT NULL DEFAULT 'main',
  "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "reorder_level" DECIMAL(12,3),
  "reorder_qty" DECIMAL(12,3),
  "last_count_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "stock_levels_product_id_location_key" ON "stock_levels"("product_id", "location");
CREATE INDEX "stock_levels_tenant_id_idx" ON "stock_levels"("tenant_id");
CREATE INDEX "stock_levels_product_id_idx" ON "stock_levels"("product_id");
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;

CREATE TABLE "recipes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "hebrew_name" TEXT,
  "description" TEXT,
  "servings" INTEGER NOT NULL DEFAULT 1,
  "prep_time_mins" INTEGER,
  "cook_time_mins" INTEGER,
  "instructions" TEXT,
  "current_version" INTEGER NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);
CREATE INDEX "recipes_tenant_id_idx" ON "recipes"("tenant_id");
CREATE INDEX "recipes_tenant_id_is_active_idx" ON "recipes"("tenant_id", "is_active");

CREATE TABLE "recipe_ingredients" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "recipe_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "quantity" DECIMAL(12,4) NOT NULL,
  "unit" TEXT NOT NULL,
  "notes" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "recipe_ingredients_recipe_id_product_id_key" ON "recipe_ingredients"("recipe_id", "product_id");
CREATE INDEX "recipe_ingredients_tenant_id_idx" ON "recipe_ingredients"("tenant_id");
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");
CREATE INDEX "recipe_ingredients_product_id_idx" ON "recipe_ingredients"("product_id");
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT;

CREATE TABLE "recipe_versions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "recipe_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changed_by" UUID,
  "change_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "recipe_versions_recipe_id_version_key" ON "recipe_versions"("recipe_id", "version");
CREATE INDEX "recipe_versions_tenant_id_idx" ON "recipe_versions"("tenant_id");
CREATE INDEX "recipe_versions_recipe_id_idx" ON "recipe_versions"("recipe_id");
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE;

-- =============================================================================
-- MENUS, EVENTS, ORDERS
-- =============================================================================
CREATE TABLE "menus" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price_per_person" DECIMAL(10,2),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "menus_tenant_id_idx" ON "menus"("tenant_id");
CREATE INDEX "menus_tenant_id_is_active_idx" ON "menus"("tenant_id", "is_active");

CREATE TABLE "events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "venue_id" UUID,
  "menu_id" UUID,
  "type" "EventType" NOT NULL DEFAULT 'OTHER',
  "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "guest_count" INTEGER NOT NULL DEFAULT 0,
  "base_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "contract_signed_at" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);
CREATE INDEX "events_tenant_id_idx" ON "events"("tenant_id");
CREATE INDEX "events_tenant_id_starts_at_idx" ON "events"("tenant_id", "starts_at");
CREATE INDEX "events_tenant_id_status_idx" ON "events"("tenant_id", "status");
CREATE INDEX "events_customer_id_idx" ON "events"("customer_id");
CREATE INDEX "events_venue_id_idx" ON "events"("venue_id");
ALTER TABLE "events" ADD CONSTRAINT "events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id");
ALTER TABLE "events" ADD CONSTRAINT "events_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id");

CREATE TABLE "menu_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "menu_id" UUID NOT NULL,
  "product_id" UUID,
  "recipe_id" UUID,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "menu_items_tenant_id_idx" ON "menu_items"("tenant_id");
CREATE INDEX "menu_items_menu_id_idx" ON "menu_items"("menu_id");
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE;
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id");

CREATE TABLE "order_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "product_id" UUID,
  "recipe_id" UUID,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "quantity" DECIMAL(10,3) NOT NULL,
  "unit_price" DECIMAL(10,2) NOT NULL,
  "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total_price" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "order_items_tenant_id_idx" ON "order_items"("tenant_id");
CREATE INDEX "order_items_event_id_idx" ON "order_items"("event_id");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id");

-- =============================================================================
-- TASKS, STAFF, DELIVERIES
-- =============================================================================
CREATE TABLE "tasks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "event_id" UUID,
  "assignee_id" UUID,
  "created_by_id" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "due_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);
CREATE INDEX "tasks_tenant_id_idx" ON "tasks"("tenant_id");
CREATE INDEX "tasks_tenant_id_status_idx" ON "tasks"("tenant_id", "status");
CREATE INDEX "tasks_assignee_id_idx" ON "tasks"("assignee_id");
CREATE INDEX "tasks_event_id_idx" ON "tasks"("event_id");
CREATE INDEX "tasks_due_at_idx" ON "tasks"("due_at");
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE TABLE "employees" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID UNIQUE,
  "employee_num" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "national_id" TEXT,
  "email" CITEXT,
  "phone" TEXT,
  "position" TEXT NOT NULL,
  "department" TEXT,
  "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
  "hire_date" DATE NOT NULL,
  "termination_date" DATE,
  "hourly_rate" DECIMAL(10,2),
  "monthly_salary" DECIMAL(12,2),
  "bank_account" TEXT,
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "employees_tenant_id_employee_num_key" ON "employees"("tenant_id", "employee_num");
CREATE UNIQUE INDEX "employees_tenant_id_national_id_key" ON "employees"("tenant_id", "national_id");
CREATE INDEX "employees_tenant_id_idx" ON "employees"("tenant_id");
CREATE INDEX "employees_tenant_id_status_idx" ON "employees"("tenant_id", "status");
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE TABLE "staff_assignments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "user_id" UUID,
  "employee_id" UUID,
  "role" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "hourly_rate" DECIMAL(10,2),
  "notes" TEXT,
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "staff_assignments_tenant_id_idx" ON "staff_assignments"("tenant_id");
CREATE INDEX "staff_assignments_event_id_idx" ON "staff_assignments"("event_id");
CREATE INDEX "staff_assignments_user_id_idx" ON "staff_assignments"("user_id");
CREATE INDEX "staff_assignments_employee_id_idx" ON "staff_assignments"("employee_id");
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL;

CREATE TABLE "vehicles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "plate_number" TEXT NOT NULL,
  "make" TEXT,
  "model" TEXT,
  "year" INTEGER,
  "color" TEXT,
  "capacity" DECIMAL(10,2),
  "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
  "insurance_expiry" DATE,
  "license_expiry" DATE,
  "last_service_at" TIMESTAMP(3),
  "next_service_at" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "vehicles_tenant_id_plate_number_key" ON "vehicles"("tenant_id", "plate_number");
CREATE INDEX "vehicles_tenant_id_idx" ON "vehicles"("tenant_id");
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

CREATE TABLE "deliveries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "vehicle_id" UUID,
  "driver_id" UUID,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "departed_at" TIMESTAMP(3),
  "arrived_at" TIMESTAMP(3),
  "destination_addr" TEXT NOT NULL,
  "notes" TEXT,
  "signature" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "deliveries_tenant_id_idx" ON "deliveries"("tenant_id");
CREATE INDEX "deliveries_event_id_idx" ON "deliveries"("event_id");
CREATE INDEX "deliveries_scheduled_at_idx" ON "deliveries"("scheduled_at");
CREATE INDEX "deliveries_status_idx" ON "deliveries"("status");
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id");
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "employees"("id");

-- =============================================================================
-- HR — SHIFTS, TIME, PAYROLL, EVALUATIONS, VACATION
-- =============================================================================
CREATE TABLE "shifts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "status" "ShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
  "role" TEXT,
  "location" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "shifts_tenant_id_idx" ON "shifts"("tenant_id");
CREATE INDEX "shifts_tenant_id_starts_at_idx" ON "shifts"("tenant_id", "starts_at");
CREATE INDEX "shifts_employee_id_idx" ON "shifts"("employee_id");
CREATE INDEX "shifts_status_idx" ON "shifts"("status");
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

CREATE TABLE "time_entries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "shift_id" UUID,
  "clock_in" TIMESTAMP(3) NOT NULL,
  "clock_out" TIMESTAMP(3),
  "break_mins" INTEGER NOT NULL DEFAULT 0,
  "total_mins" INTEGER,
  "notes" TEXT,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "approved_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "time_entries_tenant_id_idx" ON "time_entries"("tenant_id");
CREATE INDEX "time_entries_employee_id_idx" ON "time_entries"("employee_id");
CREATE INDEX "time_entries_clock_in_idx" ON "time_entries"("clock_in");
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL;

CREATE TABLE "payroll_records" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "hours_worked" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "base_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "overtime" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "bonuses" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax_withheld" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "social_security" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "net_pay" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "category" "FinancialCategory" NOT NULL DEFAULT 'OFFICIAL',
  "paid_at" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "payroll_records_employee_id_period_start_period_end_key" ON "payroll_records"("employee_id", "period_start", "period_end");
CREATE INDEX "payroll_records_tenant_id_idx" ON "payroll_records"("tenant_id");
CREATE INDEX "payroll_records_tenant_id_category_idx" ON "payroll_records"("tenant_id", "category");
CREATE INDEX "payroll_records_employee_id_idx" ON "payroll_records"("employee_id");
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

CREATE TABLE "vacation_balances" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL UNIQUE,
  "total_days" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "used_days" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "remaining_days" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "sick_days_total" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "sick_days_used" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "year" INTEGER NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "vacation_balances_tenant_id_idx" ON "vacation_balances"("tenant_id");
ALTER TABLE "vacation_balances" ADD CONSTRAINT "vacation_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

CREATE TABLE "evaluations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "evaluator_id" UUID,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "overall_score" INTEGER,
  "strengths" TEXT,
  "improvements" TEXT,
  "goals" TEXT,
  "comments" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "evaluations_tenant_id_idx" ON "evaluations"("tenant_id");
CREATE INDEX "evaluations_employee_id_idx" ON "evaluations"("employee_id");
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- =============================================================================
-- DOCUMENTS, NOTES
-- =============================================================================
CREATE TABLE "documents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID,
  "event_id" UUID,
  "uploaded_by" UUID,
  "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "file_url" TEXT NOT NULL,
  "file_size" BIGINT,
  "mime_type" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);
CREATE INDEX "documents_tenant_id_idx" ON "documents"("tenant_id");
CREATE INDEX "documents_customer_id_idx" ON "documents"("customer_id");
CREATE INDEX "documents_event_id_idx" ON "documents"("event_id");
CREATE INDEX "documents_type_idx" ON "documents"("type");
ALTER TABLE "documents" ADD CONSTRAINT "documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;
ALTER TABLE "documents" ADD CONSTRAINT "documents_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL;
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE TABLE "notes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "author_id" UUID,
  "customer_id" UUID,
  "event_id" UUID,
  "task_id" UUID,
  "content" TEXT NOT NULL,
  "visibility" "NoteVisibility" NOT NULL DEFAULT 'TEAM',
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);
CREATE INDEX "notes_tenant_id_idx" ON "notes"("tenant_id");
CREATE INDEX "notes_customer_id_idx" ON "notes"("customer_id");
CREATE INDEX "notes_event_id_idx" ON "notes"("event_id");
CREATE INDEX "notes_task_id_idx" ON "notes"("task_id");
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "notes" ADD CONSTRAINT "notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE;

-- =============================================================================
-- FINANCE — INVOICES, PAYMENTS, RECEIPTS, EXPENSES, BUDGETS
-- =============================================================================
CREATE TABLE "invoices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "event_id" UUID,
  "invoice_num" TEXT NOT NULL,
  "category" "FinancialCategory" NOT NULL DEFAULT 'OFFICIAL',
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "amount" DECIMAL(14,2) NOT NULL,
  "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(14,2) NOT NULL,
  "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'ILS',
  "issued_at" TIMESTAMP(3) NOT NULL,
  "due_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "items" JSONB NOT NULL DEFAULT '[]',
  "file_url" TEXT,
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "invoices_tenant_id_invoice_num_key" ON "invoices"("tenant_id", "invoice_num");
CREATE INDEX "invoices_tenant_id_idx" ON "invoices"("tenant_id");
CREATE INDEX "invoices_tenant_id_category_idx" ON "invoices"("tenant_id", "category");
CREATE INDEX "invoices_tenant_id_status_idx" ON "invoices"("tenant_id", "status");
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");
CREATE INDEX "invoices_event_id_idx" ON "invoices"("event_id");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id");

CREATE TABLE "payments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "event_id" UUID,
  "invoice_id" UUID,
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "category" "FinancialCategory" NOT NULL DEFAULT 'OFFICIAL',
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ILS',
  "reference" TEXT,
  "paid_at" TIMESTAMP(3),
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");
CREATE INDEX "payments_tenant_id_paid_at_idx" ON "payments"("tenant_id", "paid_at");
CREATE INDEX "payments_tenant_id_category_idx" ON "payments"("tenant_id", "category");
CREATE INDEX "payments_customer_id_idx" ON "payments"("customer_id");
CREATE INDEX "payments_event_id_idx" ON "payments"("event_id");
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");
ALTER TABLE "payments" ADD CONSTRAINT "payments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id");
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id");

CREATE TABLE "receipts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "invoice_id" UUID,
  "customer_id" UUID,
  "receipt_num" TEXT NOT NULL,
  "category" "FinancialCategory" NOT NULL DEFAULT 'OFFICIAL',
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ILS',
  "method" "PaymentMethod" NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL,
  "file_url" TEXT,
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "receipts_tenant_id_receipt_num_key" ON "receipts"("tenant_id", "receipt_num");
CREATE INDEX "receipts_tenant_id_idx" ON "receipts"("tenant_id");
CREATE INDEX "receipts_tenant_id_category_idx" ON "receipts"("tenant_id", "category");
CREATE INDEX "receipts_invoice_id_idx" ON "receipts"("invoice_id");
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;

CREATE TABLE "petty_cash" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "category" "FinancialCategory" NOT NULL DEFAULT 'UNOFFICIAL',
  "amount" DECIMAL(12,2) NOT NULL,
  "description" TEXT NOT NULL,
  "reference" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "created_by" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "petty_cash_tenant_id_idx" ON "petty_cash"("tenant_id");
CREATE INDEX "petty_cash_tenant_id_category_idx" ON "petty_cash"("tenant_id", "category");
CREATE INDEX "petty_cash_occurred_at_idx" ON "petty_cash"("occurred_at");

CREATE TABLE "budget_categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "parent_id" UUID,
  "name" TEXT NOT NULL,
  "hebrew_name" TEXT,
  "description" TEXT,
  "monthly_budget" DECIMAL(14,2),
  "yearly_budget" DECIMAL(14,2),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "budget_categories_tenant_id_name_parent_id_key" ON "budget_categories"("tenant_id", "name", "parent_id");
CREATE INDEX "budget_categories_tenant_id_idx" ON "budget_categories"("tenant_id");
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "budget_categories"("id");

CREATE TABLE "expenses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "event_id" UUID,
  "vehicle_id" UUID,
  "budget_cat_id" UUID,
  "category" "FinancialCategory" NOT NULL DEFAULT 'OFFICIAL',
  "description" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ILS',
  "payment_method" "PaymentMethod",
  "receipt_url" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "approved_by" UUID,
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "expenses_tenant_id_idx" ON "expenses"("tenant_id");
CREATE INDEX "expenses_tenant_id_category_idx" ON "expenses"("tenant_id", "category");
CREATE INDEX "expenses_tenant_id_occurred_at_idx" ON "expenses"("tenant_id", "occurred_at");
CREATE INDEX "expenses_event_id_idx" ON "expenses"("event_id");
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_budget_cat_id_fkey" FOREIGN KEY ("budget_cat_id") REFERENCES "budget_categories"("id") ON DELETE SET NULL;

CREATE TABLE "bank_transactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "account_number" TEXT NOT NULL,
  "transaction_date" DATE NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "balance" DECIMAL(14,2),
  "category" "FinancialCategory" NOT NULL DEFAULT 'OFFICIAL',
  "reference" TEXT,
  "reconciled_at" TIMESTAMP(3),
  "matched_entity_type" TEXT,
  "matched_entity_id" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "bank_transactions_tenant_id_account_number_reference_transaction_date_key" ON "bank_transactions"("tenant_id", "account_number", "reference", "transaction_date");
CREATE INDEX "bank_transactions_tenant_id_idx" ON "bank_transactions"("tenant_id");
CREATE INDEX "bank_transactions_tenant_id_transaction_date_idx" ON "bank_transactions"("tenant_id", "transaction_date");
CREATE INDEX "bank_transactions_tenant_id_category_idx" ON "bank_transactions"("tenant_id", "category");

-- =============================================================================
-- PURCHASING — SUPPLIER INVOICES, POs
-- =============================================================================
CREATE TABLE "purchase_orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "po_number" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'ILS',
  "ordered_at" TIMESTAMP(3),
  "expected_at" TIMESTAMP(3),
  "received_at" TIMESTAMP(3),
  "items" JSONB NOT NULL DEFAULT '[]',
  "notes" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "purchase_orders_tenant_id_po_number_key" ON "purchase_orders"("tenant_id", "po_number");
CREATE INDEX "purchase_orders_tenant_id_idx" ON "purchase_orders"("tenant_id");
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id");

CREATE TABLE "supplier_invoices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "po_id" UUID,
  "invoice_num" TEXT NOT NULL,
  "category" "FinancialCategory" NOT NULL DEFAULT 'OFFICIAL',
  "amount" DECIMAL(14,2) NOT NULL,
  "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ILS',
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issued_at" TIMESTAMP(3) NOT NULL,
  "due_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "file_url" TEXT,
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "supplier_invoices_tenant_id_supplier_id_invoice_num_key" ON "supplier_invoices"("tenant_id", "supplier_id", "invoice_num");
CREATE INDEX "supplier_invoices_tenant_id_idx" ON "supplier_invoices"("tenant_id");
CREATE INDEX "supplier_invoices_tenant_id_category_idx" ON "supplier_invoices"("tenant_id", "category");
CREATE INDEX "supplier_invoices_supplier_id_idx" ON "supplier_invoices"("supplier_id");
CREATE INDEX "supplier_invoices_status_idx" ON "supplier_invoices"("status");
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id");
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id");

-- =============================================================================
-- MARKETING
-- =============================================================================
CREATE TABLE "campaigns" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "channel" "NotificationChannel",
  "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "budget" DECIMAL(14,2),
  "target_segment" JSONB,
  "metrics" JSONB NOT NULL DEFAULT '{}',
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "campaigns_tenant_id_idx" ON "campaigns"("tenant_id");
CREATE INDEX "campaigns_tenant_id_status_idx" ON "campaigns"("tenant_id", "status");

CREATE TABLE "leads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "campaign_id" UUID,
  "customer_id" UUID,
  "source" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "first_name" TEXT,
  "last_name" TEXT,
  "email" CITEXT,
  "phone" TEXT,
  "estimated_value" DECIMAL(14,2),
  "notes" TEXT,
  "assigned_to" UUID,
  "contacted_at" TIMESTAMP(3),
  "closed_at" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "leads_tenant_id_idx" ON "leads"("tenant_id");
CREATE INDEX "leads_tenant_id_status_idx" ON "leads"("tenant_id", "status");
CREATE INDEX "leads_campaign_id_idx" ON "leads"("campaign_id");
CREATE INDEX "leads_assigned_to_idx" ON "leads"("assigned_to");
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL;
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;

CREATE TABLE "testimonials" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "customer_name" TEXT NOT NULL,
  "event_type" TEXT,
  "content" TEXT NOT NULL,
  "rating" INTEGER,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "published_at" TIMESTAMP(3),
  "image_url" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "testimonials_tenant_id_idx" ON "testimonials"("tenant_id");
CREATE INDEX "testimonials_tenant_id_is_published_idx" ON "testimonials"("tenant_id", "is_published");

CREATE TABLE "gallery" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "image_url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "category" TEXT,
  "tags" TEXT[],
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "gallery_tenant_id_idx" ON "gallery"("tenant_id");
CREATE INDEX "gallery_tenant_id_is_published_idx" ON "gallery"("tenant_id", "is_published");
CREATE INDEX "gallery_category_idx" ON "gallery"("category");

CREATE TABLE "portfolio" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "event_type" TEXT,
  "images_urls" TEXT[],
  "video_url" TEXT,
  "guest_count" INTEGER,
  "event_date" DATE,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "portfolio_tenant_id_idx" ON "portfolio"("tenant_id");
CREATE INDEX "portfolio_tenant_id_is_published_idx" ON "portfolio"("tenant_id", "is_published");

-- =============================================================================
-- PLATFORM
-- =============================================================================
CREATE TABLE "feature_flags" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "rollout_pct" INTEGER NOT NULL DEFAULT 0,
  "conditions" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "feature_flags_tenant_id_key_key" ON "feature_flags"("tenant_id", "key");
CREATE INDEX "feature_flags_tenant_id_idx" ON "feature_flags"("tenant_id");

CREATE TABLE "webhooks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT,
  "events" "WebhookEvent"[],
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_fired_at" TIMESTAMP(3),
  "failure_count" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "webhooks_tenant_id_idx" ON "webhooks"("tenant_id");
CREATE INDEX "webhooks_tenant_id_is_active_idx" ON "webhooks"("tenant_id", "is_active");

CREATE TABLE "integration_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "webhook_id" UUID,
  "integration" TEXT NOT NULL,
  "event" TEXT,
  "direction" TEXT NOT NULL,
  "request" JSONB,
  "response" JSONB,
  "status_code" INTEGER,
  "duration_ms" INTEGER,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "error_message" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "integration_logs_tenant_id_idx" ON "integration_logs"("tenant_id");
CREATE INDEX "integration_logs_tenant_id_occurred_at_idx" ON "integration_logs"("tenant_id", "occurred_at");
CREATE INDEX "integration_logs_webhook_id_idx" ON "integration_logs"("webhook_id");
CREATE INDEX "integration_logs_integration_idx" ON "integration_logs"("integration");
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE SET NULL;

CREATE TABLE "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "scheduled_at" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3),
  "read_at" TIMESTAMP(3),
  "error_message" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");
CREATE INDEX "notifications_tenant_id_status_idx" ON "notifications"("tenant_id", "status");
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "notifications_scheduled_at_idx" ON "notifications"("scheduled_at");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
