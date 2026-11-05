/**
 * Base de datos local SQLite (funciona SIN internet).
 * Se abre una sola vez y se reutiliza en toda la app.
 */
import * as SQLite from 'expo-sqlite';

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT NOT NULL,
  telefono      TEXT NOT NULL UNIQUE,
  correo        TEXT,
  password_sal  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  pin_sal       TEXT NOT NULL,
  pin_hash      TEXT NOT NULL,
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tandas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL,
  cuota        REAL NOT NULL CHECK (cuota > 0),
  frecuencia   TEXT NOT NULL CHECK (frecuencia IN ('semanal','quincenal','mensual')),
  fecha_inicio TEXT NOT NULL,
  estado       TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','finalizada'))
);

CREATE TABLE IF NOT EXISTS participantes (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  tanda_id INTEGER NOT NULL REFERENCES tandas(id) ON DELETE CASCADE,
  nombre   TEXT NOT NULL,
  telefono TEXT NOT NULL,
  turno    INTEGER NOT NULL,
  UNIQUE (tanda_id, turno)
);

CREATE TABLE IF NOT EXISTS rondas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tanda_id        INTEGER NOT NULL REFERENCES tandas(id) ON DELETE CASCADE,
  numero          INTEGER NOT NULL,
  fecha           TEXT NOT NULL,
  beneficiario_id INTEGER NOT NULL REFERENCES participantes(id),
  cerrada         INTEGER NOT NULL DEFAULT 0,
  UNIQUE (tanda_id, numero)
);

CREATE TABLE IF NOT EXISTS pagos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ronda_id        INTEGER NOT NULL REFERENCES rondas(id) ON DELETE CASCADE,
  participante_id INTEGER NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
  monto           REAL NOT NULL CHECK (monto > 0),
  fecha_pago      TEXT NOT NULL,
  UNIQUE (ronda_id, participante_id)
);

CREATE INDEX IF NOT EXISTS idx_tandas_usuario   ON tandas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_part_tanda       ON participantes(tanda_id);
CREATE INDEX IF NOT EXISTS idx_rondas_tanda     ON rondas(tanda_id);
CREATE INDEX IF NOT EXISTS idx_pagos_ronda      ON pagos(ronda_id);
`;

/** Cambios de esquema para bases ya creadas (se guarda la versión con PRAGMA user_version). */
async function migrar(db: SQLite.SQLiteDatabase): Promise<void> {
  const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = fila?.user_version ?? 0;

  if (version < 1) {
    // v1: método de pago (Efectivo, Banco Atlántida, etc.)
    await db.execAsync('ALTER TABLE pagos ADD COLUMN metodo TEXT;');
    await db.execAsync('PRAGMA user_version = 1;');
  }

  if (version < 2) {
    // v2: cada participante puede estar vinculado a una CUENTA (usuario_id).
    // Así el nombre y el teléfono siguen a la cuenta aunque el usuario los cambie,
    // y el dueño de la cuenta ve la tanda y recibe lo que le toca cobrar.
    await db.execAsync(`
      ALTER TABLE participantes ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
      UPDATE participantes
         SET usuario_id = (SELECT u.id FROM usuarios u WHERE u.telefono = participantes.telefono);
      CREATE INDEX IF NOT EXISTS idx_part_usuario ON participantes(usuario_id);
      PRAGMA user_version = 2;
    `);
  }

  if (version < 3) {
    // v3: recargo por atraso (configurable por tanda) y comprobante de pago (foto)
    await db.execAsync(`
      ALTER TABLE tandas ADD COLUMN recargo_tipo TEXT NOT NULL DEFAULT 'ninguno';
      ALTER TABLE tandas ADD COLUMN recargo_valor REAL NOT NULL DEFAULT 0;
      ALTER TABLE pagos ADD COLUMN recargo REAL NOT NULL DEFAULT 0;
      ALTER TABLE pagos ADD COLUMN comprobante TEXT;
      PRAGMA user_version = 3;
    `);
  }

  if (version < 4) {
    // v4: integridad entre tablas y límite de intentos de acceso.
    //  - un beneficiario debe pertenecer a la MISMA tanda de la ronda
    //  - un pago debe ser de un participante de la MISMA tanda de la ronda
    //  - seguridad_intentos guarda los fallos de login/PIN (persisten aunque se cierre la app)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS seguridad_intentos (
        clave           TEXT PRIMARY KEY,
        intentos        INTEGER NOT NULL DEFAULT 0,
        bloqueado_hasta INTEGER NOT NULL DEFAULT 0
      );
      CREATE TRIGGER IF NOT EXISTS trg_rondas_beneficiario_misma_tanda BEFORE INSERT ON rondas
      BEGIN
        SELECT RAISE(ABORT, 'El beneficiario no pertenece a la tanda')
         WHERE (SELECT tanda_id FROM participantes WHERE id = NEW.beneficiario_id) IS NOT NEW.tanda_id;
      END;
      CREATE TRIGGER IF NOT EXISTS trg_pagos_misma_tanda BEFORE INSERT ON pagos
      BEGIN
        SELECT RAISE(ABORT, 'El participante no pertenece a la tanda de la ronda')
         WHERE (SELECT tanda_id FROM participantes WHERE id = NEW.participante_id)
            IS NOT (SELECT tanda_id FROM rondas WHERE id = NEW.ronda_id);
      END;
      PRAGMA user_version = 4;
    `);
  }

  await crearIndicesUnicos(db);
}

/**
 * Índices únicos que impiden datos repetidos. Se intentan en cada arranque y por separado:
 * si una base ANTIGUA ya contiene repetidos, la app no se bloquea (queda un aviso en consola)
 * y la validación de los controladores sigue protegiendo los datos nuevos.
 */
async function crearIndicesUnicos(db: SQLite.SQLiteDatabase): Promise<void> {
  const indices = [
    // cada participante cobra UNA sola vez por tanda
    'CREATE UNIQUE INDEX IF NOT EXISTS ux_rondas_beneficiario ON rondas(tanda_id, beneficiario_id)',
    // un teléfono no puede repetirse dentro de una tanda
    'CREATE UNIQUE INDEX IF NOT EXISTS ux_part_tanda_telefono ON participantes(tanda_id, telefono)',
    // una cuenta no puede aparecer dos veces en la misma tanda
    'CREATE UNIQUE INDEX IF NOT EXISTS ux_part_tanda_usuario ON participantes(tanda_id, usuario_id) WHERE usuario_id IS NOT NULL',
  ];
  for (const sql of indices) {
    try {
      await db.execAsync(sql);
    } catch (e) {
      console.warn('No se pudo crear un índice único (la base antigua tiene datos repetidos):', sql, e);
    }
  }
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function abrir(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('mistandas.db');
  try {
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    // Nadie recibe la conexión hasta terminar: el esquema y su versión avanzan juntos.
    await db.withTransactionAsync(async () => {
      await db.execAsync(ESQUEMA);
      await migrar(db);
    });
    return db;
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}

/** Devuelve la base de datos lista para usar (crea las tablas la primera vez). */
export function obtenerDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = abrir().catch((e) => {
      dbPromise = null; // permite reintentar si falló
      throw e;
    });
  }
  return dbPromise;
}
