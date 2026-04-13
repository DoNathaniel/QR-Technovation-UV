import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { colors } from '../config';
import type { Team, TeamStudent, TeamMentor, Categoria } from '../types';
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/react';
import { toast } from '../App';

// Extract the event parameter types from the callback signatures
type DragStartParam = Parameters<DragStartEvent>[0];
type DragEndParam = Parameters<DragEndEvent>[0];

interface Student {
  ID: number;
  nombres: string;
  apellidos: string;
  categoria: Categoria;
}

interface Mentor {
  ID: number;
  nombre: string;
  apellido: string;
}

// ──────────────────────────────────────────────
// Extracted child components (hooks at top level)
// ──────────────────────────────────────────────

// --- Student components ---

function DraggableStudent({
  student,
  onRemove,
}: {
  student: Student;
  onRemove: (id: number) => void;
}) {
  const { ref, isDragging } = useDraggable({ id: `student-${student.ID}` });
  return (
    <li
      ref={ref}
      className={`flex items-center justify-between gap-2 cursor-grab bg-white border rounded px-2 py-1 shadow-sm text-xs ${isDragging ? 'opacity-40 scale-95' : ''} transition-all`}
    >
      <span className="truncate">
        {student.nombres} {student.apellidos}
      </span>
      <button
        onClick={() => onRemove(student.ID)}
        className="text-red-500 hover:text-red-700 flex-shrink-0"
        title="Quitar del equipo"
      >
        ✕
      </button>
    </li>
  );
}

function TeamStudentDropZone({
  team,
  teamStudents,
  activeDragStudent,
  onRemoveStudent,
}: {
  team: Team;
  teamStudents: Student[];
  activeDragStudent: Student | null;
  onRemoveStudent: (id: number) => void;
}) {
  const full = teamStudents.length >= 5;
  let invalidCategory = false;
  if (activeDragStudent && activeDragStudent.categoria !== team.categoria) {
    invalidCategory = true;
  }

  const { ref, isDropTarget } = useDroppable({ id: `team-${team.ID}` });

  return (
    <div
      ref={ref}
      className={`space-y-1 rounded-lg p-2 min-h-[40px] transition-colors border border-dashed
        ${isDropTarget && !full && !invalidCategory ? 'bg-green-50 border-green-400' : ''}
        ${isDropTarget && (full || invalidCategory) ? 'bg-red-50 border-red-400' : ''}
        ${!isDropTarget ? 'border-gray-200 bg-gray-50/50' : ''}
        ${full && !isDropTarget ? 'opacity-60' : ''}`}
    >
      <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1">
        Estudiantes ({teamStudents.length}/5)
      </div>
      {isDropTarget && full && (
        <div className="text-[10px] text-red-600 font-semibold">Equipo lleno (max 5)</div>
      )}
      {isDropTarget && !full && invalidCategory && (
        <div className="text-[10px] text-red-600 font-semibold">
          Categoria no coincide
        </div>
      )}
      <ul className="space-y-1">
        {teamStudents.map((s) => (
          <DraggableStudent key={s.ID} student={s} onRemove={onRemoveStudent} />
        ))}
      </ul>
      {teamStudents.length === 0 && !isDropTarget && (
        <div className="text-[10px] text-text-muted italic">Arrastra estudiantes aqui</div>
      )}
    </div>
  );
}

function UnassignedStudentsDropZone({ children }: { children: React.ReactNode }) {
  const { ref, isDropTarget } = useDroppable({ id: 'unassigned' });
  return (
    <div
      ref={ref}
      className={`space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto rounded-lg p-2 min-h-[60px] transition-colors
        ${isDropTarget ? 'bg-yellow-50 border-2 border-yellow-300' : 'border border-transparent'}`}
    >
      {children}
    </div>
  );
}

function DraggableUnassignedStudent({
  student,
  teams,
  assignments,
  onAssign,
}: {
  student: Student;
  teams: Team[];
  assignments: TeamStudent[];
  onAssign: (studentID: number, teamID: number) => void;
}) {
  const { ref, isDragging } = useDraggable({ id: `student-${student.ID}` });
  return (
    <div
      ref={ref}
      className={`border border-gray-200 rounded-lg p-2.5 flex items-center justify-between gap-2 cursor-grab bg-white hover:shadow-sm transition-all ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-text truncate">
          {student.nombres} {student.apellidos}
        </div>
        <div className="text-[10px] text-text-muted">{student.categoria}</div>
      </div>
      <select
        defaultValue=""
        onChange={(e) => {
          if (!e.target.value) return;
          onAssign(student.ID, parseInt(e.target.value));
          e.target.value = '';
        }}
        className="px-1.5 py-0.5 border border-gray-300 rounded text-[10px] flex-shrink-0"
      >
        <option value="">Equipo...</option>
        {teams
          .filter((t) => t.categoria === student.categoria)
          .map((t) => {
            const count = assignments.filter((a) => a.teamID === t.ID).length;
            const full = count >= 5;
            return (
              <option key={t.ID} value={t.ID} disabled={full}>
                {t.nombre} (#{t.numeroCorrelativo})
                {full ? ' - Lleno' : ''}
              </option>
            );
          })}
      </select>
    </div>
  );
}

// --- Mentor components ---

function DraggableMentor({ mentor }: { mentor: Mentor }) {
  const { ref, isDragging } = useDraggable({ id: `mentor-${mentor.ID}` });
  return (
    <div
      ref={ref}
      className={`border border-gray-200 rounded-lg p-2.5 cursor-grab bg-white hover:shadow-sm transition-all ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      <div className="text-sm font-medium text-text truncate">
        {mentor.nombre} {mentor.apellido}
      </div>
      <div className="text-[10px] text-text-muted">Voluntario/a</div>
    </div>
  );
}

function DraggableTeamMentor({
  mentor,
  teamID,
  onRemove,
}: {
  mentor: Mentor;
  teamID: number;
  onRemove: (mentorID: number, teamID: number) => void;
}) {
  // Use a unique draggable id per team assignment so the same mentor in different teams are distinct
  const { ref, isDragging } = useDraggable({ id: `team-mentor-${teamID}-${mentor.ID}` });
  return (
    <li
      ref={ref}
      className={`flex items-center justify-between gap-2 cursor-grab bg-white border rounded px-2 py-1 shadow-sm text-xs ${isDragging ? 'opacity-40 scale-95' : ''} transition-all`}
    >
      <span className="truncate">
        {mentor.nombre} {mentor.apellido}
      </span>
      <button
        onClick={() => onRemove(mentor.ID, teamID)}
        className="text-red-500 hover:text-red-700 flex-shrink-0"
        title="Quitar mentor"
      >
        ✕
      </button>
    </li>
  );
}

function TeamMentorDropZone({
  team,
  teamMentors,
  activeDragMentor,
  mentorAssignments,
  onRemoveMentor,
}: {
  team: Team;
  teamMentors: Mentor[];
  activeDragMentor: Mentor | null;
  mentorAssignments: TeamMentor[];
  onRemoveMentor: (mentorID: number, teamID: number) => void;
}) {
  // Check if the currently-dragged mentor is already in this team
  const alreadyInTeam =
    activeDragMentor != null &&
    mentorAssignments.some(
      (a) => a.mentorID === activeDragMentor.ID && a.teamID === team.ID
    );

  const { ref, isDropTarget } = useDroppable({ id: `team-mentor-${team.ID}` });

  return (
    <div
      ref={ref}
      className={`space-y-1 rounded-lg p-2 min-h-[40px] transition-colors border border-dashed
        ${isDropTarget && !alreadyInTeam ? 'bg-green-50 border-green-400' : ''}
        ${isDropTarget && alreadyInTeam ? 'bg-yellow-50 border-yellow-400' : ''}
        ${!isDropTarget ? 'border-gray-200 bg-gray-50/50' : ''}`}
    >
      <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1">
        Mentores ({teamMentors.length})
      </div>
      {isDropTarget && alreadyInTeam && (
        <div className="text-[10px] text-yellow-700 font-semibold">Ya esta en este equipo</div>
      )}
      <ul className="space-y-1">
        {teamMentors.map((m, idx) => (
          <DraggableTeamMentor
            key={`${m.ID}-${idx}`}
            mentor={m}
            teamID={team.ID}
            onRemove={onRemoveMentor}
          />
        ))}
      </ul>
      {teamMentors.length === 0 && !isDropTarget && (
        <div className="text-[10px] text-text-muted italic">Arrastra mentores aqui</div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Category badge colors
// ──────────────────────────────────────────────

function categoriaBadge(cat: Categoria) {
  const styles: Record<Categoria, string> = {
    Beginner: 'bg-emerald-100 text-emerald-800',
    Junior: 'bg-blue-100 text-blue-800',
    Senior: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${styles[cat]}`}>
      {cat}
    </span>
  );
}

// ──────────────────────────────────────────────
// Main page component
// ──────────────────────────────────────────────

export default function TeamsPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<TeamStudent[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [mentorAssignments, setMentorAssignments] = useState<TeamMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState<{
    nombre: string;
    ods: string;
    categoria: Categoria;
  }>({
    nombre: '',
    ods: 'ODS1',
    categoria: 'Beginner',
  });
  const [activeDragStudent, setActiveDragStudent] = useState<Student | null>(null);
  const [activeDragMentor, setActiveDragMentor] = useState<Mentor | null>(null);

  const seasonIdStr = localStorage.getItem('currentSeasonId');
  const seasonID = seasonIdStr ? parseInt(seasonIdStr, 10) : null;

  useEffect(() => {
    if (!seasonID) {
      setLoading(false);
      return;
    }
    loadAll();
  }, [seasonID]);

  const loadAll = async () => {
    if (!seasonID) return;
    setLoading(true);
    try {
      const [teamsData, studentsRes, mentorsRes, teamMentors, teamStudents] =
        await Promise.all([
          api.get<Team[]>(`/teams?seasonID=${seasonID}`),
          api.get<Student[]>(`/students?seasonID=${seasonID}`),
          api.get<Mentor[]>(`/users?rol=voluntario`),
          api.get<TeamMentor[]>(`/teams/mentors?seasonID=${seasonID}`),
          api.get<TeamStudent[]>(`/teams/students?seasonID=${seasonID}`),
        ]);
      setTeams(teamsData.data);
      setStudents(studentsRes.data);
      setAssignments(teamStudents.data);
      setMentors(mentorsRes.data);
      setMentorAssignments(teamMentors.data);
    } catch (error) {
      console.error('Error loading teams data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD handlers ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonID) return;
    try {
      const payload = {
        nombre: formData.nombre,
        ods: formData.ods,
        categoria: formData.categoria,
        seasonID,
      };
      if (editingTeam) {
        await api.put(`/teams/${editingTeam.ID}`, payload);
      } else {
        await api.post('/teams', payload);
      }
      await loadAll();
      setShowForm(false);
      setEditingTeam(null);
      setFormData({ nombre: '', ods: 'ODS1', categoria: 'Beginner' });
    } catch (error) {
      console.error('Error saving team:', error);
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      nombre: team.nombre,
      ods: team.ods,
      categoria: team.categoria,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Estas seguro de eliminar este equipo?')) return;
    try {
      await api.delete(`/teams/${id}`);
      await loadAll();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  // --- Assignment handlers (optimistic local state updates) ---

  const handleAssignStudent = async (studentID: number, teamID: number) => {
    if (!seasonID) return;

    // If the student already belongs to another team, remove them first
    const existing = assignments.find((a) => a.studentID === studentID);
    if (existing) {
      // Optimistically remove from old team
      setAssignments((prev) => prev.filter((a) => a.studentID !== studentID));
      try {
        await api.post('/teams/remove-student', { studentID, seasonID });
      } catch (error) {
        // Rollback: re-add the old assignment
        setAssignments((prev) => [...prev, existing]);
        console.error('Error removing student from previous team:', error);
        return;
      }
    }

    // Optimistically add to the new team
    const tempAssignment: TeamStudent = {
      ID: Date.now(), // temporary ID, not used for lookups
      studentID,
      teamID,
      seasonID,
      createdAt: new Date().toISOString(),
    };
    setAssignments((prev) => [...prev.filter((a) => a.studentID !== studentID), tempAssignment]);

    try {
      await api.post('/teams/assign-student', { studentID, teamID, seasonID });
    } catch (error: any) {
      // Rollback: remove the optimistic assignment (and restore the old one if it existed)
      setAssignments((prev) => {
        const without = prev.filter((a) => a.studentID !== studentID);
        return existing ? [...without, existing] : without;
      });
      toast.error(error?.response?.data?.message || 'Error al asignar estudiante');
    }
  };

  const handleRemoveStudent = async (studentID: number) => {
    if (!seasonID) return;

    // Optimistically remove
    const removed = assignments.find((a) => a.studentID === studentID);
    setAssignments((prev) => prev.filter((a) => a.studentID !== studentID));

    try {
      await api.post('/teams/remove-student', { studentID, seasonID });
    } catch (error) {
      // Rollback
      if (removed) setAssignments((prev) => [...prev, removed]);
      console.error('Error removing student from team:', error);
    }
  };

  const handleAssignMentor = async (mentorID: number, teamID: number) => {
    if (!seasonID) return;
    // Frontend guard: prevent assigning the same mentor to the same team twice
    if (mentorAssignments.some((a) => a.mentorID === mentorID && a.teamID === teamID)) {
      return;
    }

    // Optimistically add
    const tempAssignment: TeamMentor = {
      ID: Date.now(),
      mentorID,
      teamID,
      seasonID,
      createdAt: new Date().toISOString(),
    };
    setMentorAssignments((prev) => [...prev, tempAssignment]);

    try {
      await api.post('/teams/assign-mentor', { mentorID, teamID, seasonID });
    } catch (error) {
      // Rollback
      setMentorAssignments((prev) => prev.filter((a) => a !== tempAssignment));
      console.error('Error assigning mentor:', error);
    }
  };

  const handleRemoveMentor = async (mentorID: number, teamID: number) => {
    if (!seasonID) return;

    // Optimistically remove (find first match for this mentor+team combo)
    const removedIdx = mentorAssignments.findIndex(
      (a) => a.mentorID === mentorID && a.teamID === teamID
    );
    if (removedIdx === -1) return;
    const removed = mentorAssignments[removedIdx];
    setMentorAssignments((prev) => {
      const copy = [...prev];
      copy.splice(removedIdx, 1);
      return copy;
    });

    try {
      await api.post('/teams/remove-mentor', { mentorID, teamID, seasonID });
    } catch (error) {
      // Rollback
      setMentorAssignments((prev) => [...prev, removed]);
      console.error('Error removing mentor:', error);
    }
  };

  // --- Computed data ---

  const studentsByTeam = (teamID: number) =>
    assignments
      .filter((a) => a.teamID === teamID)
      .map((a) => students.find((s) => s.ID === a.studentID))
      .filter(Boolean) as Student[];

  const mentorsByTeam = (teamID: number) =>
    mentorAssignments
      .filter((a) => a.teamID === teamID)
      .map((a) => mentors.find((m) => m.ID === a.mentorID))
      .filter(Boolean) as Mentor[];

  const unassignedStudents = students.filter(
    (s) => !assignments.some((a) => a.studentID === s.ID)
  );

  // --- DND event handlers ---

  function handleDragStart(event: DragStartParam) {
    const sourceId = String(event.operation.source?.id ?? '');

    const studentMatch = sourceId.match(/^student-(\d+)$/);
    if (studentMatch) {
      const student = students.find((s) => s.ID === parseInt(studentMatch[1], 10));
      setActiveDragStudent(student || null);
      setActiveDragMentor(null);
      return;
    }

    const mentorMatch = sourceId.match(/^mentor-(\d+)$/);
    if (mentorMatch) {
      const mentor = mentors.find((m) => m.ID === parseInt(mentorMatch[1], 10));
      setActiveDragMentor(mentor || null);
      setActiveDragStudent(null);
      return;
    }

    // Dragging a mentor that's already assigned to a team (team-mentor-{teamID}-{mentorID})
    const teamMentorMatch = sourceId.match(/^team-mentor-(\d+)-(\d+)$/);
    if (teamMentorMatch) {
      const mentor = mentors.find((m) => m.ID === parseInt(teamMentorMatch[2], 10));
      setActiveDragMentor(mentor || null);
      setActiveDragStudent(null);
      return;
    }

    setActiveDragStudent(null);
    setActiveDragMentor(null);
  }

  function handleDragEnd(event: DragEndParam) {
    const draggedStudent = activeDragStudent;
    setActiveDragStudent(null);
    setActiveDragMentor(null);

    if (event.canceled) return;

    const sourceId = String(event.operation.source?.id ?? '');
    const targetId = String(event.operation.target?.id ?? '');
    if (!sourceId || !targetId) return;

    // ── Student drag logic ──
    const studentMatch = sourceId.match(/^student-(\d+)$/);
    if (studentMatch) {
      const studentID = parseInt(studentMatch[1], 10);

      // Drop onto "unassigned"
      if (targetId === 'unassigned') {
        if (assignments.some((a) => a.studentID === studentID)) {
          handleRemoveStudent(studentID);
        }
        return;
      }

      // Drop onto a team student zone
      const teamMatch = targetId.match(/^team-(\d+)$/);
      if (!teamMatch) return;
      const teamID = parseInt(teamMatch[1], 10);

      const teamObj = teams.find((t) => t.ID === teamID);
      if (!teamObj) return;

      const teamStudentCount = assignments.filter((a) => a.teamID === teamID).length;
      if (teamStudentCount >= 5) {
        toast.warning('Este equipo ya tiene 5 estudiantes');
        return;
      }

      const studentObj = draggedStudent || students.find((s) => s.ID === studentID);
      if (!studentObj || studentObj.categoria !== teamObj.categoria) {
        toast.warning('La categoría de la estudiante no coincide con este equipo');
        return;
      }

      const currentlyAssigned = assignments.find((a) => a.studentID === studentID);
      if (currentlyAssigned?.teamID === teamID) return;
      handleAssignStudent(studentID, teamID);
      return;
    }

    // ── Mentor drag logic ──
    // Source can be `mentor-{id}` (from sidebar) or `team-mentor-{teamID}-{mentorID}` (from a team)
    let mentorID: number | null = null;
    let sourceTeamID: number | null = null;

    const mentorSidebarMatch = sourceId.match(/^mentor-(\d+)$/);
    if (mentorSidebarMatch) {
      mentorID = parseInt(mentorSidebarMatch[1], 10);
    }

    const teamMentorMatch = sourceId.match(/^team-mentor-(\d+)-(\d+)$/);
    if (teamMentorMatch) {
      sourceTeamID = parseInt(teamMentorMatch[1], 10);
      mentorID = parseInt(teamMentorMatch[2], 10);
    }

    if (mentorID == null) return;

    // Drop onto a team mentor zone
    const targetTeamMentorMatch = targetId.match(/^team-mentor-(\d+)$/);
    if (targetTeamMentorMatch) {
      const targetTeamID = parseInt(targetTeamMentorMatch[1], 10);

      // Prevent duplicate: same mentor already in target team
      if (mentorAssignments.some((a) => a.mentorID === mentorID && a.teamID === targetTeamID)) {
        return; // silently ignore, UI already shows "Ya esta en este equipo"
      }

      // If dragged from another team, move: remove from old, assign to new
      if (sourceTeamID != null && sourceTeamID !== targetTeamID) {
        // Optimistically update state: remove from source, add to target
        const tempAssignment: TeamMentor = {
          ID: Date.now(),
          mentorID: mentorID!,
          teamID: targetTeamID,
          seasonID: seasonID!,
          createdAt: new Date().toISOString(),
        };
        const removedIdx = mentorAssignments.findIndex(
          (a) => a.mentorID === mentorID && a.teamID === sourceTeamID
        );
        const removed = removedIdx !== -1 ? mentorAssignments[removedIdx] : null;

        setMentorAssignments((prev) => {
          let copy = [...prev];
          if (removedIdx !== -1) copy.splice(removedIdx, 1);
          copy.push(tempAssignment);
          return copy;
        });

        (async () => {
          try {
            await api.post('/teams/remove-mentor', { mentorID, teamID: sourceTeamID, seasonID });
            await api.post('/teams/assign-mentor', { mentorID, teamID: targetTeamID, seasonID });
          } catch (error) {
            // Rollback
            setMentorAssignments((prev) => {
              let copy = prev.filter((a) => a !== tempAssignment);
              if (removed) copy.push(removed);
              return copy;
            });
            console.error('Error moving mentor between teams:', error);
          }
        })();
        return;
      }

      // If dragged from sidebar (or same team which shouldn't happen), just assign
      if (sourceTeamID == null) {
        handleAssignMentor(mentorID, targetTeamID);
      }
      return;
    }

    // If dragged from a team and dropped outside any valid target (or onto sidebar area),
    // we could remove the mentor from that team. We'll use 'unassigned-mentors' as a drop zone.
    if (targetId === 'mentor-sidebar' && sourceTeamID != null) {
      handleRemoveMentor(mentorID, sourceTeamID);
      return;
    }
  }

  // --- Early returns (after all hooks) ---

  if (!seasonID) {
    return (
      <div className="p-4">
        Debes seleccionar una temporada antes de gestionar equipos.
      </div>
    );
  }

  if (loading) return <div className="p-4">Cargando...</div>;

  // Group teams by category for visual organization
  const sortedTeams = [...teams].sort((a, b) => a.numeroCorrelativo - b.numeroCorrelativo);

  // --- Render ---

  return (
    <DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/panel')}
              className="text-text-muted hover:text-text"
            >
              &larr; Volver
            </button>
            <h1 className="text-2xl font-bold text-text">Gestion de Equipos</h1>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingTeam(null);
              setFormData({ nombre: '', ods: 'ODS1', categoria: 'Beginner' });
            }}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: colors.primary }}
          >
            + Nuevo Equipo
          </button>
        </div>

        {/* Team creation/edit form */}
        {showForm && (
          <div className="bg-surface rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    ODS
                  </label>
                  <select
                    value={formData.ods}
                    onChange={(e) =>
                      setFormData({ ...formData, ods: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {Array.from({ length: 17 }, (_, i) => `ODS${i + 1}`).map(
                      (ods) => (
                        <option key={ods} value={ods}>
                          {ods}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categoria: e.target.value as Categoria,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-white text-sm"
                  style={{ backgroundColor: colors.primary }}
                >
                  {editingTeam ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main 3-column layout: Students | Teams | Mentors */}
        <div className="grid grid-cols-[280px_1fr_280px] gap-4 items-start">
          {/* LEFT SIDEBAR — Unassigned students */}
          <div className="bg-surface rounded-lg shadow p-3 sticky top-4">
            <h2 className="text-sm font-bold text-text mb-1">
              Estudiantes sin equipo
            </h2>
            <p className="text-[10px] text-text-muted mb-2">
              Arrastra a un equipo o usa el selector.
            </p>
            <UnassignedStudentsDropZone>
              {unassignedStudents.map((s) => (
                <DraggableUnassignedStudent
                  key={s.ID}
                  student={s}
                  teams={teams}
                  assignments={assignments}
                  onAssign={handleAssignStudent}
                />
              ))}
              {unassignedStudents.length === 0 && (
                <div className="text-xs text-text-muted italic py-4 text-center">
                  Todas las estudiantes tienen equipo.
                </div>
              )}
            </UnassignedStudentsDropZone>
          </div>

          {/* CENTER — Team cards grid */}
          <div>
            {sortedTeams.length === 0 ? (
              <div className="bg-surface rounded-lg shadow p-12 text-center text-text-muted">
                No hay equipos creados para esta temporada. Crea uno para empezar.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {sortedTeams.map((team) => {
                  const tStudents = studentsByTeam(team.ID);
                  const tMentors = mentorsByTeam(team.ID);
                  return (
                    <div
                      key={team.ID}
                      className="bg-surface rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
                    >
                      {/* Card header */}
                      <div
                        className="px-4 py-2.5 flex items-center justify-between"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">
                            {team.nombre}
                          </span>
                          <span className="text-white/70 text-xs">
                            #{team.numeroCorrelativo}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {categoriaBadge(team.categoria)}
                          <span className="text-white/70 text-[10px]">{team.ods}</span>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="p-3 space-y-3">
                        {/* Students drop zone */}
                        <TeamStudentDropZone
                          team={team}
                          teamStudents={tStudents}
                          activeDragStudent={activeDragStudent}
                          onRemoveStudent={handleRemoveStudent}
                        />

                        {/* Mentors drop zone */}
                        <TeamMentorDropZone
                          team={team}
                          teamMentors={tMentors}
                          activeDragMentor={activeDragMentor}
                          mentorAssignments={mentorAssignments}
                          onRemoveMentor={handleRemoveMentor}
                        />
                      </div>

                      {/* Card footer — actions */}
                      <div className="px-3 py-2 border-t border-gray-100 flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(team)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(team.ID)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR — Mentors pool */}
          <MentorSidebar
            mentors={mentors}
            mentorAssignments={mentorAssignments}
          />
        </div>
      </div>
    </DragDropProvider>
  );
}

// ──────────────────────────────────────────────
// Mentor sidebar (needs its own component for useDroppable)
// ──────────────────────────────────────────────

function MentorSidebar({
  mentors,
  mentorAssignments,
}: {
  mentors: Mentor[];
  mentorAssignments: TeamMentor[];
}) {
  const { ref, isDropTarget } = useDroppable({ id: 'mentor-sidebar' });

  // Compute how many teams each mentor is in
  const mentorTeamCounts = (mentorID: number) =>
    mentorAssignments.filter((a) => a.mentorID === mentorID).length;

  return (
    <div
      ref={ref}
      className={`bg-surface rounded-lg shadow p-3 sticky top-4 transition-colors
        ${isDropTarget ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''}`}
    >
      <h2 className="text-sm font-bold text-text mb-1">Mentores disponibles</h2>
      <p className="text-[10px] text-text-muted mb-2">
        Arrastra a un equipo. Un mentor puede estar en varios equipos.
        Arrastra un mentor de un equipo aqui para quitarlo.
      </p>
      <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
        {mentors.map((m) => {
          const count = mentorTeamCounts(m.ID);
          return (
            <div key={m.ID} className="relative">
              <DraggableMentor mentor={m} />
              {count > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-[9px] font-bold text-white rounded-full w-4 h-4 flex items-center justify-center"
                  style={{ backgroundColor: colors.teal }}
                  title={`Asignado a ${count} equipo(s)`}
                >
                  {count}
                </span>
              )}
            </div>
          );
        })}
        {mentors.length === 0 && (
          <div className="text-xs text-text-muted italic py-4 text-center">
            No hay mentores registrados.
          </div>
        )}
      </div>
    </div>
  );
}
