/**
 * Base de datos local SQLite (funciona SIN internet TES).
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

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function abrir(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('mistandas.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(ESQUEMA);
  return db;
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
