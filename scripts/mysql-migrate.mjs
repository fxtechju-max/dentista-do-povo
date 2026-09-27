import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { connect } from './mysql-connection.mjs';

const connection = await connect();
let locked = false;
try {
  const [lock] = await connection.query("SELECT GET_LOCK('ddp_schema_migration',30) AS acquired");
  if (Number(lock[0].acquired) !== 1) throw new Error('Outra migração está em andamento.');
  locked = true;
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name varchar(191) PRIMARY KEY, checksum char(64) NOT NULL, applied_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB`);
  const folder = new URL('../mysql/migrations/', import.meta.url);
  for (const name of (await readdir(folder)).filter(f => f.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(name, folder), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const [existing] = await connection.execute('SELECT checksum FROM schema_migrations WHERE name=?', [name]);
    if (existing.length) {
      if (existing[0].checksum !== checksum) throw new Error(`Migração aplicada foi alterada: ${name}`);
      continue;
    }
    // Baseline contains DDL only, without procedures or semicolons in literals.
    for (const statement of sql.replace(/^--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean)) await connection.query(statement);
    await connection.execute('INSERT INTO schema_migrations (name,checksum) VALUES (?,?)', [name, checksum]);
    console.log(`Aplicada: ${name}`);
  }
  console.log('Estrutura MySQL atualizada.');
} finally {
  if (locked) await connection.query("SELECT RELEASE_LOCK('ddp_schema_migration')");
  await connection.end();
}
