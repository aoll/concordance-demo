CREATE TABLE "managers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"matricule" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "managers_display_name_unique" UNIQUE("display_name")
);
--> statement-breakpoint
CREATE TABLE "presences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	CONSTRAINT "zones_slug_unique" UNIQUE("slug"),
	CONSTRAINT "zones_capacity_positive" CHECK ("zones"."capacity" > 0)
);
--> statement-breakpoint
ALTER TABLE "presences" ADD CONSTRAINT "presences_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presences" ADD CONSTRAINT "presences_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "presences_one_active_per_manager" ON "presences" USING btree ("manager_id") WHERE "presences"."ended_at" IS NULL;