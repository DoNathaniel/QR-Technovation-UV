import type { Season } from '../types';

interface SeasonSelectorProps {
  temporadas: Season[];
  onSelect: (seasonId: number) => void;
  onClose?: () => void;
}

export default function SeasonSelector({ temporadas, onSelect, onClose }: SeasonSelectorProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Selecciona una Temporada
        </h2>
        <p className="text-gray-500 text-center mb-6">
          Elige la temporada con la que trabajarás
        </p>
        
        <div className="space-y-3">
          {temporadas.map((temporada) => (
            <button
              key={temporada.ID}
              onClick={() => onSelect(temporada.ID)}
              className="w-full p-5 text-left rounded-xl border-2 border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <div className="font-semibold text-lg text-gray-800 group-hover:text-blue-600">
                {temporada.nombre}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {new Date(temporada.fechaInicio).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })} - {new Date(temporada.fechaFin).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </button>
          ))}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="mt-6 w-full py-3 text-center text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}