import 'dotenv/config';
import { User } from '../models/user.model.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Creates (or updates) an admin account from environment variables.
 *
 *   npm run seed:admin  # uses ADMIN_EMAIL / ADMIN_PASSWORD (and optional
 *                       # ADMIN_FIRST_NAME / ADMIN_LAST_NAME) from .env
 *
 * The user is created as admin when the email doesn't exist yet; when it does
 * exist it is simply promoted to admin. Safe to run repeatedly.
 */
async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    logger.error('seed:admin requires ADMIN_EMAIL and ADMIN_PASSWORD in the environment');
    process.exitCode = 1;
    return;
  }

  await connectDatabase();

  const firstName = process.env.ADMIN_FIRST_NAME?.trim() || 'Admin';
  const lastName = process.env.ADMIN_LAST_NAME?.trim() || 'User';

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    await User.updateOne({ _id: existing._id }, { role: 'admin' });
    logger.info(`✅ Promoted existing user ${email} to admin`);
  } else {
    await User.create({ firstName, lastName, email, password, role: 'admin' });
    logger.info(`✅ Created admin user ${email}`);
  }

  await disconnectDatabase();
}

main().catch((error) => {
  logger.error('seed:admin failed', { error });
  process.exit(1);
});
