import { db } from './db';
import { users, roles } from './schema/hospital.schema';
import { eq, ilike } from 'drizzle-orm';

async function test() {
  const user = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      roleName: roles.name,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(ilike(users.fullName, '%Yonas%'))
    .limit(1);
  
  console.log("User record:", JSON.stringify(user, null, 2));
  process.exit(0);
}

test().catch(console.error);
