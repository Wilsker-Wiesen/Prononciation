/** Cocos Boutique: Outfits (rein kosmetisch) und Serienschutz gegen Croissants. */
import { useState } from 'react';
import { SHOP } from '../game/daily';
import { BADGES } from '../game/rewards';
import { buyItem, setOutfit } from '../game/store';
import { navigate } from '../state/appState';
import { Icon } from './components';
import { confetti, sfx } from './fx';
import { Mascot, MascotSays } from './Mascot';
import { useGame } from './MissionsView';

export function ShopView() {
  const g = useGame();
  const [msg, setMsg] = useState<{ fr: string; de: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? g.outfit;

  const onBuy = async (id: string) => {
    const r = await buyItem(id);
    if (r.ok) {
      sfx.fanfare();
      confetti(40);
      const b = r.newBadges.map((x) => BADGES.find((d) => d.id === x)).filter(Boolean).map((d) => `${d!.emoji} ${d!.title}`);
      setMsg({ fr: id === 'freeze' ? 'Ta série est protégée !' : 'Je suis trop beau, non ?', de: id === 'freeze' ? 'Deine Serie ist geschützt!' : `Steht mir, oder?${b.length ? ` Neues Abzeichen: ${b.join(', ')}` : ''}` });
      setPreview(null);
    } else {
      sfx.soft();
      setMsg({ fr: 'Pas encore…', de: r.reason ?? '' });
    }
  };

  return (
    <div>
      <button className="btn ghost" onClick={() => navigate({ name: 'home' })}><Icon.prev /> Start</button>
      <h1>🛍️ Cocos Boutique</h1>
      <div className="card">
        <div className="row between">
          <MascotSays mood={msg ? 'cheer' : 'happy'} outfit={shown} fr={msg?.fr ?? 'Bienvenue dans ma boutique !'} de={msg?.de ?? 'Croissants bekommst du für Quests, Tagesziele und Missionen.'} size={110} />
          <div className="hud"><span className="chip">🥐 {g.croissants}</span><span className="chip">🧊 {g.freezes}/2</span></div>
        </div>
        <p className="muted small" style={{ marginTop: 6 }}>Alles hier ist nur Deko für Coco – mit Aussprache-Punkten hat es nichts zu tun. Croissants gibt es fürs Üben, nicht fürs Perfektsein.</p>
      </div>
      <div className="shop">
        {SHOP.map((item) => {
          const owned = item.kind === 'outfit' && g.outfits.includes(item.id);
          const worn = g.outfit === item.id;
          return (
            <div key={item.id} className={`shop-item${owned ? ' owned' : ''}`} onMouseEnter={() => item.kind === 'outfit' && setPreview(item.id)} onMouseLeave={() => setPreview(null)}>
              {item.kind === 'outfit' ? <Mascot outfit={item.id} size={70} mood="happy" /> : <div style={{ fontSize: '3rem' }}>🧊</div>}
              <div style={{ fontWeight: 700 }}>{item.title}</div>
              <div className="muted small">{item.description}</div>
              <div style={{ marginTop: 6 }}>
                {owned ? (
                  <button className="btn" onClick={() => void setOutfit(worn ? '' : item.id)}>{worn ? 'Ablegen' : 'Anziehen'}</button>
                ) : (
                  <button className="btn primary" disabled={g.croissants < item.price || (item.kind === 'freeze' && g.freezes >= 2)} onClick={() => void onBuy(item.id)}>{item.price} 🥐</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
