import type { DetectedTechnology, DetectionContext } from './types.js';

/**
 * Detect database technologies used in the project
 */
export async function detectDatabases(ctx: DetectionContext): Promise<DetectedTechnology[]> {
  const databases: DetectedTechnology[] = [];

  // Check env vars for database connections
  if (ctx.envVars) {
    // Neon Postgres detection
    const databaseUrl = ctx.envVars['DATABASE_URL'] || ctx.envVars['POSTGRES_URL'];
    if (databaseUrl?.includes('neon.tech') || ctx.envVars['NEON_DATABASE_URL']) {
      databases.push({
        name: 'Neon Postgres',
        category: 'database',
        confidence: 'high',
        evidence: 'Environment variable with neon.tech URL',
        tags: ['neon', 'postgres', 'postgresql', 'serverless', 'database']
      });
    } else if (databaseUrl?.includes('postgres') || databaseUrl?.includes('postgresql')) {
      // Generic Postgres detection
      databases.push({
        name: 'PostgreSQL',
        category: 'database',
        confidence: 'high',
        evidence: 'DATABASE_URL contains postgres',
        tags: ['postgres', 'postgresql', 'database']
      });
    }

    // Supabase detection
    if (ctx.envVars['SUPABASE_URL'] || ctx.envVars['NEXT_PUBLIC_SUPABASE_URL'] ||
        databaseUrl?.includes('supabase')) {
      databases.push({
        name: 'Supabase',
        category: 'database',
        confidence: 'high',
        evidence: 'Supabase environment variables',
        tags: ['supabase', 'postgres', 'baas', 'database']
      });
    }

    // PlanetScale detection
    if (ctx.envVars['DATABASE_URL']?.includes('planetscale') ||
        ctx.envVars['PLANETSCALE_DATABASE_URL']) {
      databases.push({
        name: 'PlanetScale',
        category: 'database',
        confidence: 'high',
        evidence: 'PlanetScale environment variables',
        tags: ['planetscale', 'mysql', 'serverless', 'database']
      });
    }

    // Turso detection
    if (ctx.envVars['TURSO_DATABASE_URL'] || ctx.envVars['DATABASE_URL']?.includes('turso')) {
      databases.push({
        name: 'Turso',
        category: 'database',
        confidence: 'high',
        evidence: 'Turso environment variables',
        tags: ['turso', 'libsql', 'sqlite', 'edge', 'database']
      });
    }

    // MongoDB detection
    if (ctx.envVars['MONGODB_URI'] || ctx.envVars['MONGO_URL'] ||
        ctx.envVars['DATABASE_URL']?.includes('mongodb')) {
      databases.push({
        name: 'MongoDB',
        category: 'database',
        confidence: 'high',
        evidence: 'MongoDB environment variables',
        tags: ['mongodb', 'nosql', 'database']
      });
    }

    // Redis detection
    if (ctx.envVars['REDIS_URL'] || ctx.envVars['UPSTASH_REDIS_REST_URL']) {
      const isUpstash = !!ctx.envVars['UPSTASH_REDIS_REST_URL'];
      databases.push({
        name: isUpstash ? 'Upstash Redis' : 'Redis',
        category: 'database',
        confidence: 'high',
        evidence: isUpstash ? 'Upstash Redis environment variables' : 'REDIS_URL',
        tags: isUpstash
          ? ['upstash', 'redis', 'cache', 'serverless']
          : ['redis', 'cache']
      });
    }
  }

  // Check package.json for database clients and ORMs
  if (ctx.packageJson) {
    const deps = {
      ...ctx.packageJson.dependencies,
      ...ctx.packageJson.devDependencies
    };

    // Drizzle ORM
    if (deps['drizzle-orm']) {
      databases.push({
        name: 'Drizzle ORM',
        category: 'database',
        confidence: 'high',
        version: deps['drizzle-orm'].replace(/[\^~]/, ''),
        evidence: 'package.json drizzle-orm',
        tags: ['drizzle', 'orm', 'typescript', 'database']
      });
    }

    // Prisma
    if (deps['@prisma/client'] || deps['prisma']) {
      databases.push({
        name: 'Prisma',
        category: 'database',
        confidence: 'high',
        version: (deps['@prisma/client'] || deps['prisma'])?.replace(/[\^~]/, ''),
        evidence: 'package.json prisma',
        tags: ['prisma', 'orm', 'typescript', 'database']
      });
    }

    // Kysely
    if (deps['kysely']) {
      databases.push({
        name: 'Kysely',
        category: 'database',
        confidence: 'high',
        version: deps['kysely'].replace(/[\^~]/, ''),
        evidence: 'package.json kysely',
        tags: ['kysely', 'query-builder', 'typescript', 'database']
      });
    }

    // TypeORM
    if (deps['typeorm']) {
      databases.push({
        name: 'TypeORM',
        category: 'database',
        confidence: 'high',
        version: deps['typeorm'].replace(/[\^~]/, ''),
        evidence: 'package.json typeorm',
        tags: ['typeorm', 'orm', 'typescript', 'database']
      });
    }

    // Sequelize
    if (deps['sequelize']) {
      databases.push({
        name: 'Sequelize',
        category: 'database',
        confidence: 'high',
        version: deps['sequelize'].replace(/[\^~]/, ''),
        evidence: 'package.json sequelize',
        tags: ['sequelize', 'orm', 'database']
      });
    }

    // Mongoose (MongoDB)
    if (deps['mongoose']) {
      if (!databases.some(d => d.name === 'MongoDB')) {
        databases.push({
          name: 'MongoDB',
          category: 'database',
          confidence: 'high',
          evidence: 'package.json mongoose',
          tags: ['mongodb', 'nosql', 'database']
        });
      }
      databases.push({
        name: 'Mongoose',
        category: 'database',
        confidence: 'high',
        version: deps['mongoose'].replace(/[\^~]/, ''),
        evidence: 'package.json mongoose',
        tags: ['mongoose', 'orm', 'mongodb', 'database']
      });
    }

    // Neon serverless driver
    if (deps['@neondatabase/serverless']) {
      if (!databases.some(d => d.name === 'Neon Postgres')) {
        databases.push({
          name: 'Neon Postgres',
          category: 'database',
          confidence: 'high',
          evidence: 'package.json @neondatabase/serverless',
          tags: ['neon', 'postgres', 'postgresql', 'serverless', 'database']
        });
      }
    }

    // Supabase client
    if (deps['@supabase/supabase-js']) {
      if (!databases.some(d => d.name === 'Supabase')) {
        databases.push({
          name: 'Supabase',
          category: 'database',
          confidence: 'high',
          evidence: 'package.json @supabase/supabase-js',
          tags: ['supabase', 'postgres', 'baas', 'database']
        });
      }
    }

    // PostgreSQL client (pg)
    if (deps['pg'] && !databases.some(d => d.tags.includes('postgres'))) {
      databases.push({
        name: 'PostgreSQL',
        category: 'database',
        confidence: 'high',
        evidence: 'package.json pg',
        tags: ['postgres', 'postgresql', 'database']
      });
    }

    // MySQL client
    if (deps['mysql2'] || deps['mysql']) {
      if (!databases.some(d => d.tags.includes('mysql'))) {
        databases.push({
          name: 'MySQL',
          category: 'database',
          confidence: 'high',
          evidence: 'package.json mysql/mysql2',
          tags: ['mysql', 'database']
        });
      }
    }

    // SQLite (better-sqlite3)
    if (deps['better-sqlite3'] || deps['sql.js']) {
      databases.push({
        name: 'SQLite',
        category: 'database',
        confidence: 'high',
        evidence: 'package.json better-sqlite3/sql.js',
        tags: ['sqlite', 'database', 'embedded']
      });
    }

    // ioredis
    if (deps['ioredis'] || deps['redis']) {
      if (!databases.some(d => d.name.includes('Redis'))) {
        databases.push({
          name: 'Redis',
          category: 'database',
          confidence: 'high',
          evidence: 'package.json ioredis/redis',
          tags: ['redis', 'cache']
        });
      }
    }
  }

  // Check for Prisma schema file
  if (ctx.configFiles.includes('prisma/schema.prisma') ||
      ctx.configFiles.includes('schema.prisma')) {
    if (!databases.some(d => d.name === 'Prisma')) {
      databases.push({
        name: 'Prisma',
        category: 'database',
        confidence: 'high',
        evidence: 'schema.prisma',
        tags: ['prisma', 'orm', 'typescript', 'database']
      });
    }
  }

  // Check for Drizzle config
  if (ctx.configFiles.includes('drizzle.config.ts') ||
      ctx.configFiles.includes('drizzle.config.js')) {
    if (!databases.some(d => d.name === 'Drizzle ORM')) {
      databases.push({
        name: 'Drizzle ORM',
        category: 'database',
        confidence: 'high',
        evidence: 'drizzle.config.*',
        tags: ['drizzle', 'orm', 'typescript', 'database']
      });
    }
  }

  return databases;
}
