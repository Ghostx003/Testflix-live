import 'dexie-export-import';
import { db } from './db';

export async function exportDatabase(): Promise<Blob> {
  try {
    const blob = await db.export();
    return blob;
  } catch (error) {
    console.error('Error exporting database:', error);
    throw error;
  }
}

export async function importDatabase(blob: Blob): Promise<void> {
  try {
    await db.import(blob, {
      clearTablesBeforeImport: true,
      acceptMissingTables: true,
    });
  } catch (error) {
    console.error('Error importing database:', error);
    throw error;
  }
}
