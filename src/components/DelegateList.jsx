import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, UserCheck, UserX, AlertCircle, RefreshCw, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function DelegateList({ refreshTrigger, onStatusChanged }) {
  const [delegados, setDelegados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Buscador y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  
  // Visibilidad de C.I. (contraseña)
  const [visibleCiMap, setVisibleCiMap] = useState({});

  const fetchDelegados = async () => {
    try {
      setLoading(true);
      setError(null);

      // Consulta relacional con JOIN implícito para traer el nombre del equipo
      const { data, error: dbError } = await supabase
        .from('delegados')
        .select(`
          user_id,
          username,
          ci_delegado,
          nombre_completo,
          estado_cuenta,
          created_at,
          equipos (
            id,
            nombre_equipo
          )
        `)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setDelegados(data || []);
    } catch (err) {
      console.error('Error al cargar delegados:', err);
      setError('Error al conectar con la base de datos de delegados.');
    } finally {
      setLoading(false);
    }
  };

  // Recargar cuando el trigger cambie (por ejemplo, después de crear un delegado)
  useEffect(() => {
    fetchDelegados();
  }, [refreshTrigger]);

  // Alternar estado de cuenta (activo/inactivo)
  const toggleEstado = async (delegateId, currentStatus) => {
    const newStatus = currentStatus === 'activo' ? 'inactivo' : 'activo';
    
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('delegados')
        .update({ estado_cuenta: newStatus })
        .eq('user_id', delegateId);

      if (updateError) throw updateError;

      // Actualizar localmente
      setDelegados(prev =>
        prev.map(d => d.user_id === delegateId ? { ...d, estado_cuenta: newStatus } : d)
      );

      if (onStatusChanged) {
        onStatusChanged();
      }
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      setError('No se pudo actualizar el estado de la cuenta. Inténtalo de nuevo.');
    }
  };

  // Alternar visibilidad de la contraseña/C.I.
  const toggleCiVisibility = (userId) => {
    setVisibleCiMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Filtrar y buscar localmente
  const filteredDelegados = delegados.filter(d => {
    const matchesSearch = 
      d.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.equipos?.nombre_equipo?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesFilter = 
      statusFilter === 'todos' || 
      d.estado_cuenta === statusFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="panel" style={{ width: '100%' }}>
      <div className="flex-space" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <h2 className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
          Listado de Delegados
        </h2>
        <button 
          onClick={fetchDelegados} 
          className="btn btn-secondary btn-sm" 
          disabled={loading}
          style={{ display: 'inline-flex', width: 'auto' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Controles de Búsqueda y Filtro */}
      <div className="table-header-actions">
        <div className="search-bar-wrapper">
          <span className="input-icon-left">
            <Search size={18} />
          </span>
          <input
            type="text"
            className="form-input has-icon"
            placeholder="Buscar por nombre, usuario o equipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-wrapper">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="todos">Todos los Estados</option>
            <option value="activo">Solo Activos</option>
            <option value="inactivo">Solo Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla responsiva */}
      <div className="table-responsive">
        {loading && delegados.length === 0 ? (
          <div className="empty-state">
            <Loader2 size={32} className="animate-spin empty-state-icon" style={{ margin: '0 auto 1rem' }} />
            <div className="empty-state-title">Cargando Delegados</div>
            <div className="empty-state-subtitle">Por favor, espera un momento...</div>
          </div>
        ) : filteredDelegados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Search size={32} />
            </div>
            <div className="empty-state-title">No se encontraron delegados</div>
            <div className="empty-state-subtitle">Prueba con otro término de búsqueda o cambia los filtros.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Delegado</th>
                <th>Equipo asignado</th>
                <th>Nombre de Usuario</th>
                <th>C.I. / Contraseña</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredDelegados.map((d) => {
                const isCiVisible = !!visibleCiMap[d.user_id];
                return (
                  <tr key={d.user_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.nombre_completo}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Registrado: {new Date(d.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <span className="nav-user-info" style={{ display: 'inline-block', fontWeight: 500 }}>
                        {d.equipos?.nombre_equipo || `Equipo ID: ${d.equipo_id}`}
                      </span>
                    </td>
                    <td>
                      <code style={{ background: 'var(--bg-primary)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                        {d.username}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: isCiVisible ? 'monospace' : 'initial' }}>
                          {isCiVisible ? d.ci_delegado : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleCiVisibility(d.user_id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title={isCiVisible ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          {isCiVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${d.estado_cuenta === 'activo' ? 'badge-success' : 'badge-danger'}`}>
                        {d.estado_cuenta}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => toggleEstado(d.user_id, d.estado_cuenta)}
                        className={`btn btn-sm ${d.estado_cuenta === 'activo' ? 'btn-danger' : 'btn-primary'}`}
                        style={{
                          display: 'inline-flex',
                          width: 'auto',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          background: d.estado_cuenta === 'activo' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          border: `1px solid ${d.estado_cuenta === 'activo' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                          color: d.estado_cuenta === 'activo' ? '#f87171' : '#34d399',
                        }}
                      >
                        {d.estado_cuenta === 'activo' ? (
                          <>
                            <UserX size={14} />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <UserCheck size={14} />
                            Activar
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
