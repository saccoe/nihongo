import { useMemo, useState } from 'react';
import { db } from '../lib/db';
import type { Item, Group } from '../lib/types';
import { conjugate, conjugateAdj } from '../lib/conjugator';
import Furigana from './Furigana';

// Only verbs (with a group) can be conjugated in this reference table.
type Verb = Item & { group: Group };
const VERBS = db.items.all.filter((i): i is Verb => i.kind === 'verb' && i.group != null);
type Adj = Item & { kind: 'adj_i' | 'adj_na' };
const ADJS = db.items.all.filter((i): i is Adj => i.kind === 'adj_i' || i.kind === 'adj_na');
const GROUP_COLOR: Record<Group, string> = { 1: 'badge-info', 2: 'badge-warning', 3: 'badge-secondary' };

type Filter = 'all' | '1' | '2' | '3' | 'false2';

export default function Reference() {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return VERBS.filter((v) => {
      if (filter === 'false2') return v.falseG2;
      if (filter !== 'all' && v.group !== (+filter as Group)) return false;
      if (q) return v.kana.includes(q) || v.meaning.toLowerCase().includes(q);
      return true;
    });
  }, [filter, search]);

  return (
    <section className="card border border-base-300 bg-base-100 shadow-xl">
      <div className="card-body p-4 sm:p-6">
        <span className="text-xs font-bold uppercase tracking-widest text-accent">Cómo conjugar</span>

        <div className="mx-auto mt-3 flex w-full max-w-3xl flex-col gap-4">
          <RuleBlock badge="badge-info" title="Grupo 1 · ごだん (godan)">
            <p>
              Termina en sílaba de la fila <b>-u</b> (う く ぐ す つ ぬ ぶ む る). Se conjuga cambiando
              esa última sílaba.
            </p>
            <RTable
              head={['Final', 'ます', 'ない', 'て', 'た']}
              rows={[
                ['う・つ・る', '〜います…', '〜わ/た/ら +ない', '〜って', '〜った'],
                ['む・ぶ・ぬ', '〜みます…', '〜ま/ば/な +ない', '〜んで', '〜んだ'],
                ['く', '〜きます', '〜かない', '〜いて', '〜いた'],
                ['ぐ', '〜ぎます', '〜がない', '〜いで', '〜いだ'],
                ['す', '〜します', '〜さない', '〜して', '〜した'],
              ]}
            />
            <p>
              <b>ます:</b> última sílaba a fila <b>-i</b> + ます. <b>ない:</b> a fila <b>-a</b> + ない
              (う → わ). <b>Excepciones:</b> <span className="jp">いく → いって</span>,{' '}
              <span className="jp">ある → ない</span>.
            </p>
          </RuleBlock>

          <RuleBlock badge="badge-warning" title="Grupo 2 · いちだん (ichidan)">
            <p>
              Termina en <b className="jp">〜る</b> con vocal <b>i</b> o <b>e</b> antes. Quito{' '}
              <span className="jp">る</span> y agrego la terminación:
            </p>
            <RTable
              head={['ます', 'ない', 'た', 'なかった', 'て']}
              rows={[['〜ます', '〜ない', '〜た', '〜なかった', '〜て']]}
            />
            <p className="jp">
              Ej: 食べる → 食べます / 食べない / 食べて.
            </p>
          </RuleBlock>

          <RuleBlock badge="badge-secondary" title="Grupo 3 · へんかく (irregulares)">
            <RTable
              head={['Dicc.', 'ます', 'ない', 'た', 'て']}
              rows={[
                ['する', 'します', 'しない', 'した', 'して'],
                ['くる', 'きます', 'こない', 'きた', 'きて'],
              ]}
            />
            <p className="jp">
              べんきょうする、コピーする se conjugan igual que する.
            </p>
          </RuleBlock>

          <RuleBlock badge="badge-accent" title="Formas た · なかった · たり">
            <RTable
              head={['Forma', 'Cómo se arma', 'Ej.']}
              rows={[
                ['た', 'igual que て, cambiando て → た / で → だ', '書いて → 書いた'],
                ['なかった', 'forma ない: い → かった', '行かない → 行かなかった'],
                ['たり', 'forma た + り', '読んだ → 読んだり'],
              ]}
            />
            <p className="jp">
              ある → ない → なかった. いく → いった (no いいた).
            </p>
          </RuleBlock>

          <div className="rounded-box border-l-4 border-primary bg-base-100 px-4 py-3 text-sm">
            <b className="text-primary">Truco de los «falsos Grupo 2».</b> Verbos que terminan en{' '}
            <span className="jp">〜える / 〜いる</span> parecen Grupo 2, pero algunos son Grupo 1.
            Mirá dónde está la vocal <b>い/え</b> con el furigana:
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xl">
              <Example verb={{ kanji: '帰', furi: 'かえ', okuri: 'る' }} note="え DENTRO → G1" />
              <Example verb={{ kanji: '入', furi: 'はい', okuri: 'る' }} note="い dentro → G1" />
              <Example verb={{ kanji: '走', furi: 'はし', okuri: 'る' }} note="し dentro → G1" />
              <Example verb={{ kanji: '食', furi: 'た', okuri: 'べる' }} note="べ okurigana → G2" />
              <Example verb={{ kanji: '起', furi: 'お', okuri: 'きる' }} note="き okurigana → G2" />
            </div>
            <p className="mt-2 opacity-70">
              Si la vocal い/え está <b>dentro</b> de la lectura del kanji, casi siempre es Grupo 1.
              Si está en el <b>okurigana</b> (kana suelto), es Grupo 2. Verbos cortos como{' '}
              <span className="jp">みる・着る</span> hay que memorizarlos.
            </p>
          </div>
        </div>

        <span className="mt-8 text-xs font-bold uppercase tracking-widest text-accent">
          Habla informal · ふつうけい
        </span>
        <div className="mx-auto mt-3 flex w-full max-w-3xl flex-col gap-4">
          <RuleBlock badge="badge-info" title="Verbos">
            <RTable
              head={['', 'Cortés', 'Informal', 'Ej.']}
              rows={[
                ['Presente', '〜ます', 'diccionario', '行きます → 行く'],
                ['Presente neg.', '〜ません', '〜ない', '行きません → 行かない'],
                ['Pasado', '〜ました', '〜た', '行きました → 行った'],
                ['Pasado neg.', '〜ませんでした', '〜なかった', '行きませんでした → 行かなかった'],
              ]}
            />
          </RuleBlock>

          <RuleBlock badge="badge-warning" title="Sustantivos y adjetivos な">
            <RTable
              head={['', 'Cortés', 'Informal']}
              rows={[
                ['Presente', 'きれいです', 'きれい（だ）'],
                ['Presente neg.', 'きれいじゃありません', 'きれいじゃない'],
                ['Pasado', 'きれいでした', 'きれいだった'],
                ['Pasado neg.', 'きれいじゃありませんでした', 'きれいじゃなかった'],
              ]}
            />
            <p>
              <b className="jp">だ</b> sola suena muy fuerte: normalmente se omite, salvo antes de{' '}
              <span className="jp">ね / よ</span> (<span className="jp">ともだちだよ</span>).
            </p>
          </RuleBlock>

          <RuleBlock badge="badge-secondary" title="Adjetivos い">
            <RTable
              head={['', 'Cortés', 'Informal']}
              rows={[
                ['Presente', '大きいです', '大きい'],
                ['Presente neg.', '大きくないです', '大きくない'],
                ['Pasado', '大きかったです', '大きかった'],
                ['Pasado neg.', '大きくなかったです', '大きくなかった'],
              ]}
            />
            <p>
              Sólo se saca <span className="jp">です</span>. <b>Excepción:</b>{' '}
              <span className="jp">いい → よくない / よかった / よくなかった</span>.
            </p>
          </RuleBlock>

          <RuleBlock badge="badge-accent" title="Expresiones">
            <RTable
              head={['Cortés', 'Informal']}
              rows={[
                ['〜たいです', '〜たい'],
                ['〜ませんか (invitar)', '〜ない？'],
                ['〜てください', '〜て'],
                ['〜ています', '〜て（い）る'],
                ['〜ことができます', '〜ことができる'],
                ['〜たり〜たりします', '〜たり〜たりする'],
                ['〜てもいいですか', '〜てもいい？'],
                ['〜なければなりません', '〜なければならない'],
                ['〜たことがあります', '〜たことがある'],
                ['〜が (pero)', '〜けど / Sust.・adj な + だけど'],
                ['〜か', '↗ tono ascendente (？)'],
                ['はい / いいえ', 'うん / ううん'],
              ]}
            />
            <p>
              Las partículas <span className="jp">を・は・が・へ・に</span> (destino) se pueden omitir:{' '}
              <span className="jp">ビール（を）飲んだ</span>.
            </p>
          </RuleBlock>

          <RuleBlock badge="badge-primary" title="Construcciones (cap. 18–19)">
            <RTable
              head={['Patrón', 'Significado', 'Ej.']}
              rows={[
                ['V.dicc + ことができる', 'poder / saber hacer', '泳ぐことができる'],
                ['Sust. + ができる', 'ídem con Sust.+する', 'スキーができる'],
                ['しゅみは V.dicc + ことです', 'mi hobby es…', 'ギターをひくことです'],
                ['V.dicc + ことが好き', 'me gusta…', '食べることが好き'],
                ['V.dicc + まえに', 'antes de…', '寝るまえに'],
                ['Sust. + のまえに', 'antes de (evento)', '食事のまえに'],
                ['tiempo + まえに', 'hace…', '5年まえに'],
                ['V.た + ことがある', 'experiencia (lo he hecho)', '行ったことがある'],
                ['V.たり、V.たりする', 'acciones sin orden', '見たり読んだりする'],
                ['adj い: 〜くなる', 'volverse…', '強くなる'],
                ['adj な / Sust.: 〜になる', 'volverse…', '元気になる / いしゃになる'],
              ]}
            />
          </RuleBlock>
        </div>

        {/* tabla */}
        <div className="mt-6 text-xs font-bold uppercase tracking-wider opacity-70">
          Lista de verbos
        </div>
        <input
          className="input input-bordered mt-3 w-full max-w-md"
          placeholder="Buscar (kana o significado)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {(['all', '1', '2', '3', 'false2'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-secondary' : 'btn-outline'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todos' : f === 'false2' ? 'Falsos G2' : `Grupo ${f}`}
            </button>
          ))}
        </div>

        <div className="mt-3 overflow-x-auto rounded-box border border-base-300">
          <table className="table">
            <thead>
              <tr className="text-xs uppercase">
                <th>Verbo</th><th>Dicc.</th><th>ます</th><th>ない</th><th>た</th><th>なかった</th><th>て</th>
                <th>Grupo</th><th>Significado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v, i) => {
                const F = conjugate(v.kana, v.group);
                return (
                  <tr key={i} className="whitespace-nowrap">
                    <td className="jp font-semibold"><Furigana verb={v} /></td>
                    <td className="jp">{F.dict}</td>
                    <td className="jp">{F.masu}</td>
                    <td className="jp">{F.nai}</td>
                    <td className="jp">{F.ta}</td>
                    <td className="jp">{F.nakatta}</td>
                    <td className="jp">{F.te}</td>
                    <td>
                      <span className={`badge badge-sm ${GROUP_COLOR[v.group]}`}>
                        G{v.group}
                        {v.falseG2 ? '*' : ''}
                      </span>
                    </td>
                    <td>{v.meaning}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm opacity-70">
          Deslizá la tabla para ver todas las columnas. * = falso Grupo 2 (parece G2 pero es G1).
        </p>

        <div className="mt-6 text-xs font-bold uppercase tracking-wider opacity-70">
          Lista de adjetivos (informal)
        </div>
        <div className="mt-3 overflow-x-auto rounded-box border border-base-300">
          <table className="table">
            <thead>
              <tr className="text-xs uppercase">
                <th>Adjetivo</th><th>Presente</th><th>Neg.</th><th>Pasado</th><th>Pasado neg.</th>
                <th>Tipo</th><th>Significado</th>
              </tr>
            </thead>
            <tbody>
              {ADJS.map((a) => {
                const F = conjugateAdj(a.kana, a.kind);
                return (
                  <tr key={a.id} className="whitespace-nowrap">
                    <td className="jp font-semibold"><Furigana verb={a} /></td>
                    <td className="jp">{F.pres}</td>
                    <td className="jp">{F.neg}</td>
                    <td className="jp">{F.past}</td>
                    <td className="jp">{F.pastNeg}</td>
                    <td>
                      <span className={`badge badge-sm ${a.kind === 'adj_i' ? 'badge-secondary' : 'badge-warning'}`}>
                        {a.kind === 'adj_i' ? 'い' : 'な'}
                      </span>
                    </td>
                    <td>{a.meaning}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function RuleBlock({
  badge,
  title,
  children,
}: {
  badge: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-box border border-base-300 bg-base-200 px-4 py-4">
      <h3 className="mb-2 flex items-center gap-2 text-base font-bold">
        <span className={`badge ${badge} badge-sm`} />
        {title}
      </h3>
      <div className="flex flex-col gap-2 text-sm opacity-80 [&_b]:opacity-100">{children}</div>
    </div>
  );
}
function RTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-sm mt-1 w-full text-center">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="jp text-center">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="jp font-semibold">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Example({ verb, note }: { verb: { kanji: string; furi: string; okuri: string }; note: string }) {
  return (
    <span className="inline-flex flex-col items-center">
      <Furigana verb={verb} />
      <small className="mt-0.5 text-xs font-semibold opacity-60">{note}</small>
    </span>
  );
}
