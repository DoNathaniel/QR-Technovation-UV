'use strict';

// Regenera los QR existentes en R2 y actualiza qrUrl. El valor dentro del QR
// se conserva exactamente como season_{seasonID}/student_{studentID}.png.
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
require('reflect-metadata');

const { AppDataSource } = require('../src/database/data-source');
const StudentSchema = require('../src/entities/Student');
const { generateQR } = require('../src/services/qrService');

const dryRun = process.argv.includes('--dry-run');

async function main() {
  await AppDataSource.initialize();
  const repository = AppDataSource.getRepository(StudentSchema);
  const students = await repository.find({ order: { ID: 'ASC' } });
  console.log(`${dryRun ? '[Simulación] ' : ''}${students.length} QR para procesar.`);

  let processed = 0;
  for (const student of students) {
    if (dryRun) {
      console.log(`Estudiante ${student.ID}: season_${student.seasonID}/student_${student.ID}.png`);
      processed += 1;
      continue;
    }
    try {
      student.qrUrl = await generateQR(student.seasonID, student.ID);
      await repository.save(student);
      processed += 1;
    } catch (error) {
      console.error(`Error en estudiante ${student.ID}: ${error.message}`);
    }
  }

  console.log(`Finalizado: ${processed}/${students.length} QR procesados.`);
  await AppDataSource.destroy();
}

main().catch(async (error) => {
  console.error('Migración R2 fallida:', error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exit(1);
});
