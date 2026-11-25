import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

type Segment = { text?: string; annotations?: unknown; link?: ResourceLink | string };
type ResourceLink = { url?: string; embed_url?: string; preview_url?: string; copy_url?: string; kind?: string };
type Block = {
  id?: string; type?: string; rich_text?: Segment[]; caption?: Segment[]; description?: Segment[];
  children?: Block[]; columns?: string[]; cells?: Record<string, Segment[]>; header_row?: boolean;
  header_column?: boolean; checked?: boolean; icon?: string; color?: string; resource?: { url?: string; filename?: string; mime_type?: string };
  link?: ResourceLink; collection?: string; width?: number; height?: number;
};
type AgendaItem = { start?: string; end?: string; time_label?: string; activity?: string; labels?: string[]; source_cell?: string; link?: ResourceLink };
type ClassSchedule = { date?: string; planning_date?: string; date_conflict?: boolean; planning_agenda?: AgendaItem[] };
type LearningClass = { id?: string; number: number; slug?: string; title: string; source_url?: string; icon?: string; cover?: { url?: string }; blocks?: Block[]; schedule_by_venue_group?: Record<string, ClassSchedule>; notion_agenda?: AgendaItem[] };
type PathData = { title: string; semester: string; timezone?: string; source_url?: string; venue_groups: Record<string, { venues?: string[]; source?: ResourceLink; days_without_class?: { title: string; date: string }[] }>; classes: LearningClass[]; general_information?: { title?: string; source_url?: string; blocks?: Block[] }; additional_pages?: { title: string; source_url?: string; blocks?: Block[] }[]; date_conflicts?: { class_number: number; venue_group: string; notion_date: string; planning_date: string }[] };

function linkUrl(link?: ResourceLink | string) { return typeof link === 'string' ? link : link?.url; }
function safeUrl(value?: string) { if (!value) return undefined; try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.toString() : undefined; } catch { return undefined; } }
function formatDate(date?: string) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || 'Fecha por confirmar';
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
}
function youtubeStartSeconds(value: string | null) {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const parts = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  return parts ? Number(parts[1] || 0) * 3600 + Number(parts[2] || 0) * 60 + Number(parts[3] || 0) : 0;
}
function flags(segment: Segment) {
  const flattened = JSON.stringify(segment.annotations || []).toLowerCase();
  return { bold: flattened.includes('"b"'), italic: flattened.includes('"i"'), underline: flattened.includes('"_"'), strike: flattened.includes('"s"'), code: flattened.includes('"c"'), color: /(?:pink|yellow|purple|blue|green|red)_background/.exec(flattened)?.[0] };
}

function RichText({ segments = [] }: { segments?: Segment[] }) {
  return <>{segments.map((segment, index) => {
    const style = flags(segment);
    let content: React.ReactNode = segment.text || '';
    if (style.code) content = <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.92em]">{content}</code>;
    if (style.strike) content = <s>{content}</s>;
    if (style.underline) content = <u>{content}</u>;
    if (style.italic) content = <em>{content}</em>;
    if (style.bold) content = <strong>{content}</strong>;
    if (style.color) content = <mark className="rounded bg-amber-100 px-0.5">{content}</mark>;
    const href = safeUrl(linkUrl(segment.link));
    if (href) content = <a className="text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900" href={href} target="_blank" rel="noreferrer">{content}</a>;
    return <Fragment key={index}>{content}</Fragment>;
  })}</>;
}

function ExternalLink({ href, children, className = '' }: { href?: string; children: React.ReactNode; className?: string }) {
  const url = safeUrl(href);
  return url ? <a className={className} href={url} target="_blank" rel="noreferrer">{children}</a> : null;
}

function BlockContent({ block, onImage }: { block: Block; onImage: (url: string) => void }) {
  const children = block.children || [];
  const content = <RichText segments={block.rich_text || []} />;
  const link = block.link;
  const href = safeUrl(linkUrl(link));
  const resourceUrl = safeUrl(block.resource?.url) || href;
  const description = <RichText segments={block.description || []} />;
  const caption = <RichText segments={block.caption || []} />;
  switch (block.type) {
    case 'header': return <h2 className="mt-7 text-2xl font-bold text-slate-900">{content}</h2>;
    case 'sub_header': return <h3 className="mt-6 text-xl font-semibold text-slate-900">{content}</h3>;
    case 'sub_sub_header': return <h4 className="mt-5 text-lg font-semibold text-slate-800">{content}</h4>;
    case 'header_4': return <h5 className="mt-4 text-base font-semibold text-slate-800">{content}</h5>;
    case 'text': return <p className="my-2 whitespace-pre-wrap leading-7 text-slate-700">{content}{href && !block.rich_text?.length && <ExternalLink href={href} className="break-all text-blue-700 underline">{href}</ExternalLink>}</p>;
    case 'bulleted_list': return <li className="my-1 leading-7 text-slate-700">{content}</li>;
    case 'numbered_list': return <li className="my-1 leading-7 text-slate-700">{content}</li>;
    case 'to_do': return <div className="my-2 flex items-start gap-2 text-slate-700"><input type="checkbox" checked={Boolean(block.checked)} readOnly className="mt-1"/><span className={block.checked ? 'line-through opacity-70' : ''}>{content}</span></div>;
    case 'toggle': return <details className="my-3 rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer font-medium text-slate-800">{content}</summary><div className="mt-2 pl-2">{renderBlockList(children, onImage)}</div></details>;
    case 'quote': return <blockquote className="my-4 border-l-4 border-violet-300 bg-violet-50/70 px-4 py-3 italic text-slate-700">{content}</blockquote>;
    case 'callout': return <aside className="my-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-slate-800"><span aria-hidden="true">{block.icon || '💡'}</span><div>{content}<div>{renderBlockList(children, onImage)}</div></div></aside>;
    case 'divider': return <hr className="my-6 border-slate-200" />;
    case 'column_list': return <div className="my-4 grid grid-cols-1 gap-4 md:grid-cols-2">{children.map((child) => <div key={child.id} className="min-w-0">{renderBlock(child, onImage)}</div>)}</div>;
    case 'column': case 'transclusion_container': return <div className="space-y-2">{renderBlockList(children, onImage)}</div>;
    case 'table': {
      const columns = block.columns || [];
      const rows = children.filter((row) => row.type === 'table_row');
      const body = rows.map((row, rowIndex) => <tr key={row.id || rowIndex} className={block.header_row && rowIndex === 0 ? 'bg-slate-100' : 'odd:bg-white even:bg-slate-50'}>{columns.map((column, columnIndex) => {
        const Tag = (block.header_row && rowIndex === 0) || (block.header_column && columnIndex === 0) ? 'th' : 'td';
        return <Tag key={column} scope={Tag === 'th' ? (columnIndex === 0 ? 'row' : 'col') : undefined} className="border border-slate-200 px-3 py-2 text-left align-top">{<RichText segments={row.cells?.[column] || []}/>}</Tag>;
      })}</tr>);
      return <div className="my-4 overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[34rem] border-collapse text-sm">{block.header_row && <thead>{body.slice(0, 1)}</thead>}<tbody>{block.header_row ? body.slice(1) : body}</tbody></table></div>;
    }
    case 'table_row': return null;
    case 'image': {
      if (!resourceUrl) return <p className="my-3 text-sm text-slate-500">Imagen no disponible: {block.resource?.filename || block.rich_text?.[0]?.text}</p>;
      return <figure className="my-5"><button type="button" onClick={() => onImage(resourceUrl)} className="block max-w-full cursor-zoom-in"><img src={resourceUrl} alt={(block.caption || block.rich_text || []).map((x) => x.text).join('') || block.resource?.filename || 'Imagen de la ruta'} loading="lazy" className="max-h-[32rem] max-w-full rounded-lg object-contain" /></button>{(block.caption?.length || block.rich_text?.length) ? <figcaption className="mt-2 text-center text-sm text-slate-500">{block.caption?.length ? caption : content}</figcaption> : null}</figure>;
    }
    case 'pdf': {
      if (!resourceUrl) return <p className="my-3">PDF no disponible {block.resource?.filename || ''}</p>;
      return <div className="my-5 overflow-hidden rounded-lg border border-slate-200"><div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3"><span className="text-sm font-medium">{(block.rich_text || []).map((x) => x.text).join('') || block.resource?.filename || 'Documento PDF'}</span><ExternalLink href={resourceUrl} className="text-sm font-medium text-blue-700 underline">Abrir o descargar PDF</ExternalLink></div><iframe title={block.resource?.filename || 'Documento PDF'} src={resourceUrl} className="h-[min(75vh,650px)] w-full" loading="lazy" /></div>;
    }
    case 'video': {
      if (!link?.embed_url) return <ExternalLink href={href} className="my-3 inline-block text-blue-700 underline">Ver video original</ExternalLink>;
      let embedUrl = link.embed_url;
      try { const original = new URL(link.url || ''); const start = youtubeStartSeconds(original.searchParams.get('t') || original.searchParams.get('start')); if (start) { const embed = new URL(embedUrl); embed.searchParams.set('start', String(start)); embedUrl = embed.toString(); } } catch { /* keep supplied embed URL */ }
      return <div className="my-5"><div className="aspect-video overflow-hidden rounded-lg bg-black"><iframe title="Video de la clase" src={embedUrl} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" /></div><ExternalLink href={href} className="mt-2 inline-block text-sm text-blue-700 underline">Abrir video original</ExternalLink></div>;
    }
    case 'file': case 'bookmark': {
      const label = (block.rich_text || []).map((x) => x.text).join('') || block.resource?.filename || href || 'Recurso';
      const previewUrl = safeUrl(link?.preview_url || link?.embed_url);
      const copyUrl = safeUrl(link?.copy_url);
      return <div className="my-4 rounded-lg border border-slate-200 p-4"><p className="font-medium text-slate-800">{block.type === 'bookmark' ? '🔗 ' : '📎 '}{label}</p>{description && <p className="mt-1 text-sm text-slate-600">{description}</p>}{previewUrl && <iframe title={`Vista previa: ${label}`} src={previewUrl} className="mt-3 h-[min(65vh,560px)] w-full rounded border border-slate-200" loading="lazy"/>}<div className="mt-3 flex flex-wrap gap-4"><ExternalLink href={href || resourceUrl} className="text-sm text-blue-700 underline">Abrir original</ExternalLink>{copyUrl && <ExternalLink href={copyUrl} className="text-sm font-medium text-blue-700 underline">Hacer una copia</ExternalLink>}</div></div>;
    }
    case 'collection_view': return <div className="my-4 rounded-lg border border-violet-200 bg-violet-50 p-4"><p className="font-medium">{block.collection || 'Clases de la ruta'}</p><a href="#classes-list" className="mt-1 inline-block text-sm font-medium text-violet-800 underline">Ir al listado de clases</a></div>;
    default: return <div className="my-3 rounded border border-slate-200 px-3 py-2 text-sm text-slate-600"><p>{content || `Bloque no disponible (${block.type || 'tipo desconocido'}).`}</p>{href && <ExternalLink href={href} className="text-blue-700 underline">Abrir recurso</ExternalLink>}{children.length > 0 && <div className="mt-2">{renderBlockList(children, onImage)}</div>}</div>;
  }
}

function renderBlock(block: Block, onImage: (url: string) => void): React.ReactNode {
  if (block.type === 'bulleted_list') return <ul key={block.id} className="my-2 list-disc pl-6"><BlockContent block={block} onImage={onImage}/></ul>;
  if (block.type === 'numbered_list') return <ol key={block.id} className="my-2 list-decimal pl-6"><BlockContent block={block} onImage={onImage}/></ol>;
  return <div key={block.id}><BlockContent block={block} onImage={onImage}/>{block.children?.length && !['toggle', 'callout', 'column_list', 'column', 'transclusion_container'].includes(block.type || '') ? <div className="pl-4">{renderBlockList(block.children, onImage)}</div> : null}</div>;
}
function renderBlockList(blocks: Block[], onImage: (url: string) => void) { return blocks.map((block) => renderBlock(block, onImage)); }

export default function LearningPathPage() {
  const { currentSeasonId, temporadas } = useAuth();
  const season = temporadas.find((candidate) => candidate.ID === currentSeasonId);
  const [pathData, setPathData] = useState<PathData | null>(null);
  const [missingFile, setMissingFile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [venueGroup, setVenueGroup] = useState('');
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedPage, setSelectedPage] = useState<'general' | number>('general');
  const [largeImage, setLargeImage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSeasonId) { setPathData(null); setLoading(false); return; }
    let active = true;
    setLoading(true); setLoadError(false); setSelectedClass(null); setSelectedPage('general');
    api.get(`/seasons/${currentSeasonId}/learning-path`).then((response) => {
      if (!active) return;
      setPathData(response.data.path); setMissingFile(Boolean(response.data.unavailable));
      const groups = Object.keys(response.data.path?.venue_groups || {});
      setVenueGroup(groups.includes('otras-sedes') ? 'otras-sedes' : groups[0] || '');
    }).catch(() => { if (active) setLoadError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentSeasonId]);

  if (loading) return <div className="mx-auto max-w-6xl py-10 text-center text-slate-500">Cargando ruta de aprendizaje…</div>;
  if (loadError) return <section className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-6 text-red-800">No se pudo cargar la ruta. Intenta recargar la página.</section>;
  if (!pathData) return <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-center"><div className="text-4xl">📚</div><h1 className="mt-3 text-2xl font-bold text-slate-900">Ruta de aprendizaje</h1><p className="mt-3 text-slate-600">{missingFile ? 'La ruta seleccionada para esta temporada ya no está disponible. Contacta a administración.' : 'Todavía no hay una ruta de aprendizaje configurada para esta temporada'}</p>{season && <p className="mt-2 text-sm text-slate-500">{season.nombre}</p>}</section>;

  const classes = [...pathData.classes].sort((a, b) => a.number - b.number);
  const currentClass = classes.find((item) => item.number === selectedClass);
  const currentSchedule: ClassSchedule | undefined = currentClass?.schedule_by_venue_group?.[venueGroup];
  const currentPage = selectedPage === 'general' ? pathData.general_information : pathData.additional_pages?.[selectedPage];
  const pageTitle = selectedPage === 'general' ? pathData.general_information?.title || 'Información general' : pathData.additional_pages?.[selectedPage]?.title;
  const agenda: AgendaItem[] = currentSchedule?.planning_agenda?.length ? currentSchedule.planning_agenda : currentClass?.notion_agenda || [];

  const openClass = (number: number) => { setSelectedClass(number); setSelectedPage('general'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const scheduleSummary = (item: LearningClass) => {
    const schedule = item.schedule_by_venue_group?.[venueGroup];
    const items = schedule?.planning_agenda?.length ? schedule.planning_agenda : item.notion_agenda || [];
    const starts = items.map((entry) => entry.start).filter((value): value is string => Boolean(value)).sort();
    const ends = items.map((entry) => entry.end).filter((value): value is string => Boolean(value)).sort();
    return { date: schedule?.date || 'Fecha por confirmar', time: starts.length ? `${starts[0]} – ${ends.at(-1) || starts[0]}` : items[0]?.time_label || 'Horario por confirmar' };
  };

  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-violet-800 to-indigo-700 p-6 text-white shadow-sm sm:p-8"><Link to="/panel" className="text-sm text-white/80 hover:text-white">← Volver al panel</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-violet-200">{pathData.semester} · {season?.nombre}</p><p className="mt-2 max-w-3xl text-sm text-white/75">Toda la información presentada aquí fue obtenida del Notion oficial de Technovation para el semestre.</p></div><ExternalLink href={pathData.source_url} className="rounded-lg border border-white/40 px-4 py-2 text-sm font-medium hover:bg-white/10">Ver en Notion ↗</ExternalLink></div></div>
    <div className="space-y-5">
      {selectedClass === null && <section id="classes-list" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Tu recorrido</p><h2 className="mt-0.5 text-lg font-bold text-slate-900">Selecciona una clase</h2></div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">{classes.length} clases · {pathData.venue_groups[venueGroup]?.venues?.includes('Universidad de Valparaíso') ? 'Otras sedes' : pathData.venue_groups[venueGroup]?.venues?.join(', ') || venueGroup}</span>
        </div>
        <nav className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Clases de la ruta">
          {classes.map((item) => {
            const summary = scheduleSummary(item);
            const isActive = selectedClass === item.number;
            return <button key={item.id || item.number} aria-pressed={isActive} onClick={() => openClass(item.number)} className={`group relative min-h-32 overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${isActive ? 'border-violet-400 bg-gradient-to-br from-violet-50 to-white shadow-md ring-1 ring-violet-200' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md'}`}>
              <span className="flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${isActive ? 'bg-violet-700 text-white' : 'bg-violet-50 text-violet-700 group-hover:bg-violet-100'}`}>{String(item.number).padStart(2, '0')}</span>
                {isActive ? <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-semibold text-violet-800">✓ Seleccionada</span> : <span className="text-xl" aria-hidden="true">{item.icon || '📘'}</span>}
              </span>
              <span className="mt-3 block line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-800">{item.title}</span>
              <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500"><span>{formatDate(summary.date)}</span><span className="font-medium text-slate-600">{summary.time}</span></span>
            </button>;
          })}
        </nav>
      </section>}
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3" role="tablist" aria-label="Páginas de la ruta"><button role="tab" aria-selected={selectedClass === null && selectedPage === 'general'} onClick={() => { setSelectedClass(null); setSelectedPage('general'); }} className={`rounded-lg px-3 py-2 text-sm ${selectedClass === null && selectedPage === 'general' ? 'bg-violet-100 font-semibold text-violet-900' : 'text-slate-600 hover:bg-slate-100'}`}>Información general</button>{pathData.additional_pages?.map((page, index) => <button key={page.title} role="tab" aria-selected={selectedClass === null && selectedPage === index} onClick={() => { setSelectedClass(null); setSelectedPage(index); }} className={`rounded-lg px-3 py-2 text-sm ${selectedClass === null && selectedPage === index ? 'bg-violet-100 font-semibold text-violet-900' : 'text-slate-600 hover:bg-slate-100'}`}>{page.title}</button>)}</div>
        <article className="p-4 sm:p-7">{currentClass ? <><div className="mb-4"><button type="button" onClick={() => { setSelectedClass(null); setSelectedPage('general'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 transition-colors hover:border-violet-300 hover:bg-violet-100">← Volver al selector de clases</button></div><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Clase {currentClass.number}</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{currentClass.icon} {currentClass.title}</h2></div><ExternalLink href={currentClass.source_url} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Ver en Notion ↗</ExternalLink></div>{currentClass.cover?.url && <button type="button" onClick={() => setLargeImage(currentClass.cover?.url || null)} className="mt-5 block max-h-80 max-w-full cursor-zoom-in"><img src={currentClass.cover.url} alt={`Portada de ${currentClass.title}`} className="max-h-80 max-w-full rounded-lg object-contain" loading="lazy" /></button>}<div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">Fecha</p><p className="mt-1 font-medium text-slate-800">{formatDate(currentSchedule?.date)}</p>{currentSchedule?.planning_date && currentSchedule.planning_date !== currentSchedule.date && <p className="mt-1 text-sm text-amber-800">Planificación enlazada: {formatDate(currentSchedule.planning_date)} · fecha de la planilla</p>}</div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">Sedes de esta planificación</p><p className="mt-1 font-medium text-slate-800">{pathData.venue_groups[venueGroup]?.venues?.join(' · ') || venueGroup}</p></div></div>{currentSchedule?.date_conflict && <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">Esta clase tiene fechas distintas: Notion indica {formatDate(currentSchedule.date)} y la planilla enlazada indica {formatDate(currentSchedule.planning_date)}.</div>}<section className="mt-5"><h3 className="mb-3 text-lg font-semibold text-slate-900">Agenda</h3>{agenda.length ? <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[32rem] text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Horario</th><th className="px-3 py-2 text-left">Actividad</th></tr></thead><tbody>{agenda.map((item, index) => <tr key={`${index}-${item.start}`} className="border-t border-slate-100"><td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">{item.time_label || `${item.start || ''}${item.end ? ` – ${item.end}` : ''}`}</td><td className="px-3 py-2 text-slate-700">{item.activity || item.labels?.join(', ') || ''}{item.source_cell && <span className="ml-2 text-xs text-slate-400">{item.source_cell}</span>}{item.link?.url && <ExternalLink href={item.link.url} className="ml-2 text-blue-700 underline">Abrir</ExternalLink>}</td></tr>)}</tbody></table></div> : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">La agenda aún no está publicada.</p>}</section><div className="prose prose-slate mt-7 max-w-none">{currentClass.blocks?.length ? renderBlockList(currentClass.blocks, setLargeImage) : <p className="text-slate-500">Esta clase aún no tiene contenido.</p>}</div></> : <><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-700">{selectedPage === 'general' ? 'Portada del semestre' : 'Página adicional'}</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{pageTitle}</h2></div><ExternalLink href={currentPage?.source_url || (selectedPage === 'general' ? pathData.source_url : undefined)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Ver en Notion ↗</ExternalLink></div><div className="mt-5">{currentPage?.blocks?.length ? renderBlockList(currentPage.blocks, setLargeImage) : <p className="text-slate-500">No hay contenido disponible.</p>}</div></>}</article>
      </section>
    </div>
    {largeImage && <div role="dialog" aria-modal="true" aria-label="Imagen ampliada" onClick={() => setLargeImage(null)} className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-4"><button className="absolute right-4 top-4 rounded-full bg-white/20 px-4 py-2 text-white" onClick={() => setLargeImage(null)}>Cerrar ✕</button><img src={largeImage} alt="Imagen ampliada de la ruta" className="max-h-[90vh] max-w-[95vw] object-contain" /></div>}
  </div>;
}
