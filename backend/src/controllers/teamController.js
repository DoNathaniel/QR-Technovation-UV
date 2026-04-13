'use strict';
const { AppDataSource } = require('../database/data-source');
const TeamSchema = require('../entities/Team');
const TeamStudentSchema = require('../entities/TeamStudent');
const TeamMentorSchema = require('../entities/TeamMentor');
const StudentSchema = require('../entities/Student');
const UserSchema = require('../entities/User');

const teamRepository = () => AppDataSource.getRepository(TeamSchema);
const teamStudentRepository = () => AppDataSource.getRepository(TeamStudentSchema);
const teamMentorRepository = () => AppDataSource.getRepository(TeamMentorSchema);
const studentRepository = () => AppDataSource.getRepository(StudentSchema);
const userRepository = () => AppDataSource.getRepository(UserSchema);

const list = async (req, res) => {
	const { seasonID } = req.query;
	let where = {};
	if (seasonID) {
		const n = Number(seasonID);
		if (Number.isFinite(n)) {
			where = { seasonID: n };
		} else {
		}
	}

	const teams = await teamRepository().find({ where });
	res.json(teams);
};

const get = async (req, res) => {
  const { id } = req.params;
  const team = await teamRepository().findOne({ where: { ID: parseInt(id) } });
  if (!team) return res.status(404).json({ message: 'Team not found' });
  res.json(team);
};

const create = async (req, res) => {
  try {
    let data = req.body;
    // Autonumérico por season: buscar correlativo
    const count = await teamRepository().count({ where: { seasonID: data.seasonID } });
    data.numeroCorrelativo = count + 1;

    const team = teamRepository().create(data);
    const result = await teamRepository().save(team);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await teamRepository().findOne({ where: { ID: parseInt(id) } });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    Object.assign(team, req.body);
    await teamRepository().save(team);
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await teamRepository().delete(parseInt(id));
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Asigna o desasigna una niña a un equipo
const assignStudent = async (req, res) => {
  // body: { studentID, teamID, seasonID }
  try {
    const { studentID, teamID, seasonID } = req.body;
    // Restricción: solo un equipo por temporada para cada niña
    const exists = await teamStudentRepository().findOne({ where: { studentID, seasonID } });
    if (exists) return res.status(400).json({ message: 'La niña ya pertenece a un equipo en esta temporada.' });
    // Restricción: máximo 5 estudiantes por equipo
    const count = await teamStudentRepository().count({ where: { teamID } });
    if (count >= 5) return res.status(400).json({ message: 'El equipo ya tiene 5 integrantes.' });

    const rel = teamStudentRepository().create({ studentID, teamID, seasonID });
    await teamStudentRepository().save(rel);

    // Also update the student's teamID in the Student table
    const student = await studentRepository().findOne({ where: { ID: studentID } });
    if (student) {
      student.teamID = teamID;
      await studentRepository().save(student);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const removeStudent = async (req, res) => {
  // body: { studentID, seasonID }
  try {
    const { studentID, seasonID } = req.body;
    const result = await teamStudentRepository().delete({ studentID, seasonID });
    
    // Also clear the student's teamID in the Student table
    const student = await studentRepository().findOne({ where: { ID: studentID } });
    if (student) {
      student.teamID = null;
      await studentRepository().save(student);
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Asignación de mentor a equipo (sin restricciones)
const assignMentor = async (req, res) => {
  // body: { mentorID, teamID, seasonID }
  try {
    const { mentorID, teamID, seasonID } = req.body;
    const rel = teamMentorRepository().create({ mentorID, teamID, seasonID });
    await teamMentorRepository().save(rel);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const removeMentor = async (req, res) => {
  // body: { mentorID, teamID, seasonID }
  try {
    const { mentorID, teamID, seasonID } = req.body;
    const result = await teamMentorRepository().delete({ mentorID, teamID, seasonID });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET all team-student assignments for a season
// Stub temporal: devolvemos siempre lista vacía para evitar errores de NaN
const listTeamStudents = async (req, res) => {
  const { seasonID } = req.query;
	let where = {};
	if (seasonID) {
		const n = Number(seasonID);
		if (Number.isFinite(n)) {
			where = { seasonID: n };
		} else {
		}
	}

	const students = await teamStudentRepository().find({ where });
	res.json(students);
};

// GET all team-mentor assignments for a season
// Stub temporal: devolvemos siempre lista vacía para evitar errores de NaN
const listTeamMentors = async (req, res) => {
  const { seasonID } = req.query;
	let where = {};
	if (seasonID) {
		const n = Number(seasonID);
		if (Number.isFinite(n)) {
			where = { seasonID: n };
		} else {
		}
	}

	const mentors = await teamMentorRepository().find({ where });
	res.json(mentors);
};

module.exports = { list, get, create, update, remove, assignStudent, removeStudent, assignMentor, removeMentor, listTeamStudents, listTeamMentors };
