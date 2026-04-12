const express = require('express');
const router = express.Router();
const { authenticateToken, checkRole } = require('../middleware');
const teamController = require('../controllers/teamController');

// Asignación de estudiantes y mentores
router.post('/assign-student', authenticateToken, checkRole('superadmin', 'admin'), teamController.assignStudent);
router.post('/remove-student', authenticateToken, checkRole('superadmin', 'admin'), teamController.removeStudent);
router.post('/assign-mentor', authenticateToken, checkRole('superadmin', 'admin'), teamController.assignMentor);
router.post('/remove-mentor', authenticateToken, checkRole('superadmin', 'admin'), teamController.removeMentor);

// Obtener asignaciones TeamStudent (todas las niñas con equipos para una temporada)
router.get('/students', authenticateToken, teamController.listTeamStudents);

// Obtener asignaciones TeamMentor (todos los mentores asignados a equipos para una temporada)
router.get('/mentors', authenticateToken, checkRole("superadmin", "admin"), teamController.listTeamMentors);

// CRUD Equipos
router.get('/', authenticateToken, teamController.list);
router.get('/:id', authenticateToken, teamController.get);
router.post('/', authenticateToken, checkRole('superadmin', 'admin'), teamController.create);
router.put('/:id', authenticateToken, checkRole('superadmin', 'admin'), teamController.update);
router.delete('/:id', authenticateToken, checkRole('superadmin', 'admin'), teamController.remove);

module.exports = router;
