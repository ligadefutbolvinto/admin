import React, { useState, useEffect } from 'react';
import { supabase, supabaseSignUpClient } from '../lib/supabase';
import { User, Shield, Tag, Users, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function DelegateForm({ onDelegateCreated }) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [ciDelegado, setCiDelegado] = useState('');
  const [username, setUsername] = useState('');
  const [equipoId, setEquipoId] = useState('');
  
  const [equipos, setEquipos] = useState([]);
  const [loadingEquipos, setLoadingEquipos] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Cargar la lista de equipos al montar el componente
  useEffect(() => {
    async function fetchEquipos() {
      try {
        setLoadingEquipos(true);
        const { data, error } = await supabase
          .from('equipos')
          .select('id, nombre')
          .order('nombre', { ascending: true });

        if (error) throw error;
        setEquipos(data || []);
      } catch (err) {
        console.error('Error al cargar equipos:', err);
        setError('No se pudieron cargar los equipos. Verifica la conexión.');
      } finally {
        setLoadingEquipos(false);
      }
    }

    fetchEquipos();
  }, []);

  // Formatear el username en tiempo real: minúsculas, sin espacios, sin caracteres especiales
  const handleUsernameChange = (e) => {
    const value = e.target.value;
    const formatted = value
      .toLowerCase()
      .replace(/\s+/g, '') // Eliminar espacios
      .replace(/[^a-z0-9_]/g, ''); // Solo letras, números y guión bajo
    setUsername(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validaciones
    if (!nombreCompleto.trim()) {
      setError('El nombre del delegado es requerido.');
      return;
    }
    if (!ciDelegado.trim()) {
      setError('La C.I. (contraseña) es requerida.');
      return;
    }
    if (!username.trim()) {
      setError('El nombre de usuario es requerido.');
      return;
    }
    if (!equipoId) {
      setError('Debes seleccionar un equipo.');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Preparar correo ficticio para Supabase Auth
      const emailFicticio = `${username}@ligadefutbolvinto.com`;
      const password = ciDelegado.trim();

      // 2. Registrar el usuario en Supabase Auth usando el cliente especial de registro
      // (esto evita que el administrador actual sea desautenticado de su sesión)
      const { data: authData, error: authError } = await supabaseSignUpClient.auth.signUp({
        email: emailFicticio,
        password: password,
        options: {
          data: {
            display_name: nombreCompleto,
            role: 'delegado'
          }
        }
      });

      if (authError) {
        // Manejar errores comunes de Auth
        if (authError.message.includes('already registered')) {
          throw new Error(`El nombre de usuario "${username}" ya está registrado.`);
        }
        throw authError;
      }

      const newUser = authData?.user;
      if (!newUser) {
        throw new Error('No se pudo crear el usuario de autenticación.');
      }

      // 3. Registrar el delegado en la tabla pública delegados usando el cliente principal
      const { error: dbError } = await supabase
        .from('delegados')
        .insert([
          {
            user_id: newUser.id,
            equipo_id: parseInt(equipoId, 10),
            username: username,
            ci_delegado: password,
            nombre_completo: nombreCompleto.trim(),
            estado_cuenta: 'activo'
          }
        ]);

      if (dbError) {
        throw dbError;
      }

      // Éxito
      setSuccess(`Delegado registrado con éxito. Usuario: ${username}`);
      setNombreCompleto('');
      setCiDelegado('');
      setUsername('');
      setEquipoId('');
      
      // Notificar al componente padre para refrescar la lista
      if (onDelegateCreated) {
        onDelegateCreated();
      }

    } catch (err) {
      console.error('Error al registrar delegado:', err);
      setError(err.message || 'Ocurrió un error inesperado al registrar al delegado.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <h2 className="panel-title">
        <Users size={20} className="color-primary" />
        Registrar Nuevo Delegado
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

      <form onSubmit={handleSubmit} className="delegate-form">
        <div className="form-group">
          <label className="form-label">Nombre Completo del Delegado</label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <User size={18} />
            </span>
            <input
              type="text"
              className="form-input has-icon"
              placeholder="Ej. Juan Pérez"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">C.I. (Contraseña Inicial)</label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <Shield size={18} />
            </span>
            <input
              type="text"
              className="form-input has-icon"
              placeholder="Ej. 7894561"
              value={ciDelegado}
              onChange={(e) => setCiDelegado(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          <span className="form-helper">Esta C.I. será la contraseña de acceso del delegado.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Nombre de Usuario (Sin espacios)</label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <Tag size={18} />
            </span>
            <input
              type="text"
              className="form-input has-icon"
              placeholder="Ej. clubpenarol"
              value={username}
              onChange={handleUsernameChange}
              disabled={submitting}
              required
            />
          </div>
          <span className="form-helper">
            Se generará el correo ficticio: <strong>{username ? `${username}@ligadefutbolvinto.com` : 'usuario@ligadefutbolvinto.com'}</strong>
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Equipo que Administra</label>
          <div className="input-wrapper">
            <span className="input-icon-left">
              <Users size={18} />
            </span>
            <select
              className="form-input has-icon"
              value={equipoId}
              onChange={(e) => setEquipoId(e.target.value)}
              disabled={submitting || loadingEquipos}
              required
            >
              <option value="">-- Seleccionar Equipo --</option>
              {equipos.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre}
                </option>
              ))}
            </select>
          </div>
          {loadingEquipos && <span className="form-helper">Cargando equipos de la liga...</span>}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || loadingEquipos}
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Registrando Cuenta...
            </>
          ) : (
            'Crear Cuenta de Delegado'
          )}
        </button>
      </form>
    </div>
  );
}
