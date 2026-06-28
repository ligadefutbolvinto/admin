import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Trophy, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Loader2 
} from 'lucide-react';

export default function TeamManager({ onTeamsChanged }) {
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Agregar Equipo
  const [newTeamName, setNewTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Editar Equipo Inline
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState(null);
  
  // Estados de Alertas
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchEquipos();
  }, []);

  const fetchEquipos = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from('equipos')
        .select('*')
        .order('nombre', { ascending: true });

      if (dbError) throw dbError;
      setEquipos(data || []);
    } catch (err) {
      console.error('Error al cargar equipos:', err);
      setError('No se pudieron cargar los equipos de la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const nameTrimmed = newTeamName.trim();
    if (!nameTrimmed) {
      setError('El nombre del equipo no puede estar vacío.');
      return;
    }

    // Validación local de duplicados
    const duplicate = equipos.some(
      (eq) => eq.nombre.toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (duplicate) {
      setError(`Ya existe un equipo registrado con el nombre "${nameTrimmed}".`);
      return;
    }

    try {
      setSubmitting(true);
      const { error: insertError } = await supabase
        .from('equipos')
        .insert([{ nombre: nameTrimmed }]);

      if (insertError) throw insertError;

      setSuccess(`Equipo "${nameTrimmed}" registrado con éxito.`);
      setNewTeamName('');
      
      // Recargar lista local y notificar al componente padre
      await fetchEquipos();
      if (onTeamsChanged) {
        onTeamsChanged();
      }
    } catch (err) {
      console.error('Error al agregar equipo:', err);
      setError(err.message || 'Error al guardar el nuevo equipo.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (team) => {
    setEditingTeamId(team.id);
    setEditingName(team.nombre);
    setError(null);
    setSuccess(null);
  };

  const cancelEditing = () => {
    setEditingTeamId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (teamId) => {
    setError(null);
    setSuccess(null);
    const nameTrimmed = editingName.trim();

    if (!nameTrimmed) {
      setError('El nombre del equipo no puede estar vacío.');
      return;
    }

    // Validar duplicados exceptuando a sí mismo
    const duplicate = equipos.some(
      (eq) => eq.id !== teamId && eq.nombre.toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (duplicate) {
      setError(`Ya existe otro equipo registrado con el nombre "${nameTrimmed}".`);
      return;
    }

    try {
      setSavingId(teamId);
      const { error: updateError } = await supabase
        .from('equipos')
        .update({ nombre: nameTrimmed })
        .eq('id', teamId);

      if (updateError) throw updateError;

      setSuccess('Nombre del equipo actualizado correctamente.');
      setEditingTeamId(null);
      setEditingName('');

      await fetchEquipos();
      if (onTeamsChanged) {
        onTeamsChanged();
      }
    } catch (err) {
      console.error('Error al editar equipo:', err);
      setError(err.message || 'Error al actualizar el equipo.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    setError(null);
    setSuccess(null);

    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar el equipo "${teamName}"?\n\nADVERTENCIA: Esto también afectará a los delegados asociados.`
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const { error: deleteError } = await supabase
        .from('equipos')
        .delete()
        .eq('id', teamId);

      if (deleteError) throw deleteError;

      setSuccess(`Equipo "${teamName}" eliminado correctamente.`);
      await fetchEquipos();
      if (onTeamsChanged) {
        onTeamsChanged();
      }
    } catch (err) {
      console.error('Error al eliminar equipo:', err);
      setError(err.message || 'No se pudo eliminar el equipo. Verifica que no tenga dependencias.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar equipos por buscador
  const filteredEquipos = equipos.filter((eq) =>
    eq.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-grid">
      {/* Panel Izquierdo: Agregar Equipo */}
      <div className="panel">
        <h2 className="panel-title">
          <Trophy size={20} className="color-primary" style={{ color: 'var(--primary)' }} />
          Agregar Nuevo Equipo
        </h2>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckCircle size={18} className="flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleAddTeam}>
          <div className="form-group">
            <label className="form-label">Nombre del Equipo</label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Trophy size={18} />
              </span>
              <input
                type="text"
                className="form-input has-icon"
                placeholder="Ej. Club Peñarol Vinto"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ marginTop: '0.5rem' }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Plus size={16} />
                Registrar Equipo
              </>
            )}
          </button>
        </form>
      </div>

      {/* Panel Derecho: Listado de Equipos */}
      <div className="panel" style={{ width: '100%' }}>
        <div className="flex-space" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
          <h2 className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
            Listado de Equipos
          </h2>
          <span className="nav-user-info" style={{ fontWeight: 500 }}>
            {equipos.length} Equipos en Total
          </span>
        </div>

        {/* Buscador */}
        <div className="table-header-actions" style={{ justifyContent: 'flex-start' }}>
          <div className="search-bar-wrapper">
            <span className="input-icon-left">
              <Search size={18} />
            </span>
            <input
              type="text"
              className="form-input has-icon"
              placeholder="Buscar equipo por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="table-responsive">
          {loading && equipos.length === 0 ? (
            <div className="empty-state">
              <Loader2 size={32} className="animate-spin empty-state-icon" style={{ margin: '0 auto 1rem' }} />
              <div className="empty-state-title">Cargando Equipos</div>
              <div className="empty-state-subtitle">Buscando datos de la liga...</div>
            </div>
          ) : filteredEquipos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Search size={32} />
              </div>
              <div className="empty-state-title">No se encontraron equipos</div>
              <div className="empty-state-subtitle">Prueba con otro término de búsqueda.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Nombre del Equipo</th>
                  <th>Fecha Registro</th>
                  <th style={{ textAlign: 'right', width: '200px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipos.map((eq) => {
                  const isEditing = editingTeamId === eq.id;
                  const isSaving = savingId === eq.id;
                  
                  return (
                    <tr key={eq.id}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        #{eq.id}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            disabled={isSaving}
                            autoFocus
                          />
                        ) : (
                          <span style={{ fontWeight: 600 }}>{eq.nombre}</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {eq.created_at ? new Date(eq.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(eq.id)}
                                className="btn btn-sm btn-primary"
                                style={{
                                  display: 'inline-flex',
                                  width: 'auto',
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.8rem'
                                }}
                                disabled={isSaving}
                              >
                                {isSaving ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Save size={14} />
                                )}
                                Guardar
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="btn btn-sm btn-secondary"
                                style={{
                                  display: 'inline-flex',
                                  width: 'auto',
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.8rem'
                                }}
                                disabled={isSaving}
                              >
                                <X size={14} />
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(eq)}
                                className="btn btn-sm btn-secondary"
                                style={{
                                  display: 'inline-flex',
                                  width: 'auto',
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.8rem',
                                  borderColor: 'var(--border-color)',
                                  color: 'var(--text-secondary)'
                                }}
                              >
                                <Edit2 size={14} />
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteTeam(eq.id, eq.nombre)}
                                className="btn btn-sm btn-danger"
                                style={{
                                  display: 'inline-flex',
                                  width: 'auto',
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.8rem',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#f87171'
                                }}
                              >
                                <Trash2 size={14} />
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
