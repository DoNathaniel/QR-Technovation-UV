import type { Season } from '../types';

interface SeasonSelectorProps {
  temporadas: Season[];
  onSelect: (seasonId: number) => void;
  onClose?: () => void;
}

export default function SeasonSelector({ temporadas, onSelect, onClose }: SeasonSelectorProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-text mb-4">Seleccionar Temporada</h2>
        <p className="text-text-muted mb-4">Por favor selecciona una temporada para continuar:</p>
        
        <div className="space-y-3">
          {temporadas.map((temporada) => (
            <button
              key={temporada.ID}
              onClick={() => onSelect(temporada.ID)}
              className="w-full p-4 text-left rounded-lg border-2 border-gray-200 hover:border-accent transition-colors"
              style={{ borderColor: 'border-gray-200' }}
            >
              <div className="font-medium text-text">{temporada.nombre}</div>
              <div className="text-sm text-text-muted mt-1">
                {new Date(temporada.fechaInicio).toLocaleDateString('es-CL')} - {new Date(temporada.fechaFin).toLocaleDateString('es-CL')}
              </div>
            </button>
          ))}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 w-full text-center text-text-muted hover:text-text"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}