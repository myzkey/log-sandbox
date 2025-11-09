#!/usr/bin/env tsx
import { db } from './client';
import { awsProfiles, albLogs } from './schema';
import { sql } from 'drizzle-orm';

async function seedProfiles() {
  console.log('Seeding AWS profiles from existing logs...');

  // Get unique profiles from alb_logs
  const existingProfiles = await db
    .selectDistinct({ name: albLogs.awsProfile })
    .from(albLogs);

  console.log(`Found ${existingProfiles.length} unique profiles in logs`);

  // Insert profiles if they don't exist
  for (const { name } of existingProfiles) {
    // Check if profile already exists
    const existing = await db
      .select()
      .from(awsProfiles)
      .where(sql`${awsProfiles.name} = ${name}`)
      .limit(1);

    if (existing.length === 0) {
      await db.insert(awsProfiles).values({
        name,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        description: `AWS Profile: ${name}`,
      });
      console.log(`  ✓ Added profile: ${name}`);
    } else {
      console.log(`  - Profile already exists: ${name}`);
    }
  }

  console.log('\nDone!');
}

seedProfiles().catch((error) => {
  console.error('Error seeding profiles:', error);
  process.exit(1);
});
